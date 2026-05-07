/**
 * Coralogix DataPrime query client.
 * Returns time-bucketed log counts grouped by severity using a single bucketed
 * DataPrime query (roundTime + groupby), matching the resolution Coralogix's
 * own UI uses.
 */

const SEVERITIES = ['Info', 'Error', 'Warning', 'Debug', 'Verbose'];

// Range → DataPrime bucket size string (must be a unit Coralogix accepts: 30s, 1m, 5m, etc.)
const RANGE_CONFIG = {
  '15m': { rangeMs: 15 * 60 * 1000,           bucketSec: 30,    label: '30s' },
  '1h':  { rangeMs: 60 * 60 * 1000,           bucketSec: 60,    label: '1m'  },
  '4h':  { rangeMs: 4 * 60 * 60 * 1000,       bucketSec: 300,   label: '5m'  },
  '24h': { rangeMs: 24 * 60 * 60 * 1000,      bucketSec: 1800,  label: '30m' },
};

function normalizeSeverity(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'info' || s === 'information' || s === '3') return 'Info';
  if (s === 'error' || s === 'err' || s === '5') return 'Error';
  if (s === 'warning' || s === 'warn' || s === '4') return 'Warning';
  if (s === 'debug' || s === '2') return 'Debug';
  if (s === 'verbose' || s === 'trace' || s === '1') return 'Verbose';
  if (s === 'critical' || s === 'fatal' || s === '6') return 'Error';
  return null;
}

function parseNdjsonRows(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return [];
  const rows = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { continue; }
    if (obj?.result?.results) rows.push(...obj.result.results);
    else if (obj?.results) rows.push(...obj.results);
  }
  return rows;
}

function rowToBucket(row) {
  // The roundTime + groupby query returns rows where userData is a JSON string like:
  //   {"bucket": <nanos>, "cnt": N, "severity": "Info"}
  let severity = null;
  let count = null;
  let bucketNanos = null;

  if (typeof row?.userData === 'string') {
    try {
      const ud = JSON.parse(row.userData);
      severity = normalizeSeverity(ud.severity);
      count = Number(ud.cnt);
      // bucket can be a number (nanos) or an ISO string depending on Coralogix's serialization.
      if (typeof ud.bucket === 'number') bucketNanos = ud.bucket;
      else if (typeof ud.bucket === 'string') {
        const asNum = Number(ud.bucket);
        if (Number.isFinite(asNum) && asNum > 1e15) bucketNanos = asNum;
        else {
          const ms = Date.parse(ud.bucket);
          if (!Number.isNaN(ms)) bucketNanos = ms * 1_000_000;
        }
      }
    } catch {}
  }

  if (!severity || !Number.isFinite(count) || !Number.isFinite(bucketNanos)) return null;
  return { severity, count, bucketMs: Math.round(bucketNanos / 1_000_000) };
}

async function runBucketedQuery({ apiUrl, apiKey, subsystem, range }) {
  const cfg = RANGE_CONFIG[range] || RANGE_CONFIG['1h'];
  const now = Date.now();
  const endDate = new Date(now).toISOString();
  const startDate = new Date(now - cfg.rangeMs).toISOString();

  const escSubsystem = subsystem.replace(/'/g, "\\'");
  const query =
    `source logs ` +
    `| filter $l.subsystemname == '${escSubsystem}' ` +
    `| groupby $m.severity, roundTime($m.timestamp, ${cfg.label}) as bucket ` +
    `aggregate count() as cnt ` +
    `| orderby bucket asc`;

  const body = {
    query,
    metadata: {
      tier: 'TIER_FREQUENT_SEARCH',
      syntax: 'QUERY_SYNTAX_DATAPRIME',
      defaultSource: 'logs',
      startDate,
      endDate,
      limit: 50_000,
    },
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const snippet = text.length > 500 ? text.slice(0, 500) + '…' : text;
    throw new Error(`Coralogix ${res.status}: ${snippet}`);
  }
  return { rows: parseNdjsonRows(text), startDate, endDate, cfg };
}

function assembleBuckets({ rows, startDate, endDate, cfg }) {
  const startMs = Date.parse(startDate);
  const endMs = Date.parse(endDate);
  const bucketMs = cfg.bucketSec * 1000;

  // Generate the full bucket grid, aligned to bucket boundaries
  const firstBucketMs = Math.floor(startMs / bucketMs) * bucketMs;
  const buckets = [];
  for (let t = firstBucketMs; t < endMs; t += bucketMs) {
    const b = { ts: new Date(t).toISOString() };
    for (const sev of SEVERITIES) b[sev] = 0;
    buckets.push(b);
  }
  const indexByMs = new Map(buckets.map((b, i) => [Date.parse(b.ts), i]));

  for (const row of rows) {
    const parsed = rowToBucket(row);
    if (!parsed) continue;
    const alignedMs = Math.floor(parsed.bucketMs / bucketMs) * bucketMs;
    const idx = indexByMs.get(alignedMs);
    if (idx == null) continue;
    if (buckets[idx][parsed.severity] != null) {
      buckets[idx][parsed.severity] += parsed.count;
    }
  }

  const totals = {};
  for (const sev of SEVERITIES) {
    const values = buckets.map((b) => b[sev]);
    const sum = values.reduce((a, b) => a + b, 0);
    totals[sev] = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(sum / values.length),
      sum,
    };
  }
  return { buckets, totals, bucketMs };
}

// In-memory cache: dedupes in-flight calls (kills React StrictMode double-mount
// hammering Coralogix) and serves repeat requests within TTL from memory.
const RESULT_TTL_MS = 30_000;
const cache = new Map();

async function fetchScannerLogsSummary(opts) {
  const key = `${opts.subsystem}::${opts.range || '1h'}`;
  const entry = cache.get(key);
  const now = Date.now();
  if (entry) {
    if (!entry.completedAt) return entry.promise;
    if (now - entry.completedAt < RESULT_TTL_MS) return entry.promise;
  }
  const promise = doFetchScannerLogsSummary(opts).then(
    (val) => { const e = cache.get(key); if (e) e.completedAt = Date.now(); return val; },
    (err) => { cache.delete(key); throw err; }
  );
  cache.set(key, { promise, completedAt: null });
  return promise;
}

async function doFetchScannerLogsSummary({ subsystem, range = '1h' }) {
  const apiKey = process.env.CORALOGIX_API_KEY;
  const apiUrl = process.env.CORALOGIX_API_URL;
  if (!apiKey) { const e = new Error('CORALOGIX_API_KEY not set'); e.code = 'NO_API_KEY'; throw e; }
  if (!apiUrl) { const e = new Error('CORALOGIX_API_URL not set'); e.code = 'NO_API_URL'; throw e; }

  const queryResult = await runBucketedQuery({ apiUrl, apiKey, subsystem, range });
  const { buckets, totals, bucketMs } = assembleBuckets(queryResult);

  return {
    range,
    bucketMs,
    severities: SEVERITIES,
    buckets,
    totals,
    isMock: false,
  };
}

module.exports = { fetchScannerLogsSummary, SEVERITIES };
