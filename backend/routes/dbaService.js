// /api/dba/service — status / reload / audit-log
// Talks to the BettingAdsService stack via two env-configured URLs:
//   BETTINGADS_CONFIG_URL   default http://localhost:8000  (ConfigurationService)
//   BETTINGADS_ADS_URL      default http://localhost:8002  (AdsGeneratorService)
// Both pings are best-effort; missing services are reported as 'down' rather
// than failing the request, so the UI still loads when BettingAdsService is
// offline (the common dev case).
const express = require('express');
const { pool } = require('../db/mysql');
const { auditRowToJson, isoOrNull } = require('./_dbaShape');
const { appendAuditEntry } = require('./_dbaAudit');

const router = express.Router();

const CONFIG_URL = process.env.BETTINGADS_CONFIG_URL || 'http://localhost:8000';
const ADS_URL    = process.env.BETTINGADS_ADS_URL    || 'http://localhost:8002';
const COOLDOWN_SEC = 120;
const PING_TIMEOUT_MS = 1500;

async function pingJson(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ac.signal });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function loadServiceState() {
  const [[row]] = await pool.query('SELECT * FROM dba_service_state WHERE id = 1');
  return row || { last_restart_at: null, last_restart_by: null };
}

router.get('/status', async (req, res, next) => {
  try {
    const state = await loadServiceState();
    const lastRestartAt = isoOrNull(state.last_restart_at);
    const lastRestartBy = state.last_restart_by;

    const [config, ads] = await Promise.all([
      pingJson(`${CONFIG_URL}/`),
      pingJson(`${ADS_URL}/status`),
    ]);

    const cacheSizeBytes = (ads.body && typeof ads.body === 'object' && typeof ads.body.cache_size === 'number')
      ? ads.body.cache_size
      : 0;

    let status = 'down';
    if (config.ok && ads.ok) status = 'running';
    else if (config.ok || ads.ok) status = 'degraded';

    const lastRestartMs = lastRestartAt ? Date.parse(lastRestartAt) : NaN;
    const uptimeSec = Number.isFinite(lastRestartMs) && status === 'running'
      ? Math.max(0, Math.floor((Date.now() - lastRestartMs) / 1000))
      : 0;
    const cooldownRemainingSec = Number.isFinite(lastRestartMs)
      ? Math.max(0, COOLDOWN_SEC - Math.floor((Date.now() - lastRestartMs) / 1000))
      : 0;

    res.json({
      status,
      lastRestartAt,
      lastRestartBy,
      cacheSizeBytes,
      uptimeSec,
      cooldownRemainingSec,
      services: {
        configuration: { url: CONFIG_URL, ok: config.ok, statusCode: config.status, error: config.error },
        adsGenerator:  { url: ADS_URL,    ok: ads.ok,    statusCode: ads.status,    error: ads.error },
      },
    });
  } catch (err) { next(err); }
});

router.post('/reload', async (req, res, next) => {
  try {
    const actor = req.body?.actor || 'D. Benvelgy';
    const targets = [
      { key: 'dbaConfiguration',   url: `${CONFIG_URL}/dbaConfiguration/Reload` },
      { key: 'topSelections',      url: `${CONFIG_URL}/TopSelections/Reload` },
      { key: 'gamesConfiguration', url: `${CONFIG_URL}/GamesConfiguration/Reload` },
    ];
    const results = await Promise.all(targets.map(async (t) => {
      const r = await pingJson(t.url);
      return { key: t.key, ok: r.ok, statusCode: r.status, error: r.error };
    }));
    const okCount = results.filter((r) => r.ok).length;
    const now = new Date();
    await pool.query(
      `UPDATE dba_service_state SET last_restart_at = ?, last_restart_by = ? WHERE id = 1`,
      [now, actor],
    );
    await appendAuditEntry({
      kind: 'restart',
      who: actor,
      text: okCount === targets.length
        ? 'Reloaded all configurations'
        : `Reload partial (${okCount}/${targets.length} ok)`,
    });
    res.json({
      success: okCount > 0,
      reloadedCount: okCount,
      totalCount: targets.length,
      results,
      lastRestartAt: now.toISOString(),
    });
  } catch (err) { next(err); }
});

router.get('/audit-log', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const [rows] = await pool.query(
      'SELECT * FROM dba_audit_log ORDER BY occurred_at DESC, id DESC LIMIT ?',
      [limit],
    );
    res.json(rows.map(auditRowToJson));
  } catch (err) { next(err); }
});

// One-shot: rewrite legacy interstitial size_id 640x1280 → 320x480 in MySQL.
// Safe to re-run. Does not touch GAM — re-export snippets after migrating.
router.post('/migrate-interstitial-size', async (req, res, next) => {
  try {
    const actor = req.body?.actor || 'system';
    const [result] = await pool.query(
      `UPDATE dba_templates
          SET size_id = '320x480',
              size_label = 'Interstitial · 320×480',
              modified = ?,
              modified_by = ?
        WHERE size_id = '640x1280'`,
      [new Date(), actor],
    );
    const affected = result.affectedRows || 0;
    await appendAuditEntry({
      kind: 'edit',
      who: actor,
      text: `Migrated ${affected} interstitial template(s) 640x1280 → 320x480`,
    });
    res.json({ ok: true, migrated: affected });
  } catch (err) { next(err); }
});

module.exports = router;
