// In-memory cache mapping country display name -> COUNTRY_ID (CID), sourced
// from the real production T_COUNTRIES table (MSSQL SportifierDB).
//
// backend/data/countries.json is NOT a reliable source for this — it's a
// separately-seeded local mirror whose COUNTRY_ID values do not match
// production (verified: local file has Italy=4/England=3, production
// T_COUNTRIES has Italy=3/England=1). Always resolve CIDs from here.
//
// Loaded at startup and refreshed periodically. In local dev, MSSQL requires
// VPN and being unreachable is expected/benign. In production the service
// runs inside the VPC with direct DB connectivity, so a refresh failure
// there means something is actually broken (network/credentials/DB down) —
// every failure is logged at error level so it surfaces in monitoring, not
// just the first one. CID resolution degrades to null (matches "any
// country") while broken rather than crashing the whole /api/bp route.

const { getPool } = require('../db');

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // country list changes essentially never

let nameToId = new Map();
let lastSuccessAt = null;
let consecutiveFailures = 0;

async function refresh() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT c.COUNTRY_ID AS id, dv.VALUE AS name
      FROM T_COUNTRIES c
      LEFT JOIN T_DICT_VALUES dv ON dv.TERM_ID = c.NAME_ID AND dv.LANG_ID = 1
      WHERE dv.VALUE IS NOT NULL
    `);
    const map = new Map();
    for (const row of result.recordset) {
      const key = String(row.name).trim().toLowerCase();
      if (!map.has(key)) map.set(key, row.id); // first match wins on duplicate names
    }
    nameToId = map;
    lastSuccessAt = Date.now();
    consecutiveFailures = 0;
    console.log(`[countryCache] loaded ${map.size} country name(s) from T_COUNTRIES`);
  } catch (err) {
    consecutiveFailures += 1;
    if (!lastSuccessAt) {
      console.error(`[countryCache] ERROR: never loaded — every BP promotion's Targeting.CID is resolving to null. MSSQL/T_COUNTRIES unreachable (attempt ${consecutiveFailures}): ${err.message}`);
    } else {
      const staleMinutes = Math.round((Date.now() - lastSuccessAt) / 60000);
      console.error(`[countryCache] ERROR: refresh failed, serving ${staleMinutes}min-stale data (${consecutiveFailures} consecutive failures): ${err.message}`);
    }
  }
}

function start() {
  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
}

// The BP Editor's Geo dropdown (DBA_COUNTRIES) uses display names that don't
// always match T_COUNTRIES' — add aliases here as mismatches surface.
const GEO_NAME_ALIASES = {
  'united kingdom': 'england', // T_COUNTRIES has no "United Kingdom" entry, only "England"
};

function resolveCid(geo) {
  if (!geo || geo === 'All') return null;
  const key = String(geo).trim().toLowerCase();
  return nameToId.get(GEO_NAME_ALIASES[key] || key) ?? null;
}

module.exports = { start, resolveCid };
