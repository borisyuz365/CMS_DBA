// In-memory cache of countries (id + display name), sourced from the real
// production T_COUNTRIES table (MSSQL SportifierDB).
//
// backend/data/countries.json is NOT a reliable source for this — it's a
// separately-seeded local mirror whose COUNTRY_ID values do not match
// production (verified: local file has Italy=4/England=3, production
// T_COUNTRIES has Italy=3/England=1). Always source CIDs from here.
//
// The CMS now stores/matches BP promotions by numeric CID directly (not a
// country name), so the only thing this cache needs to provide is the
// {id, name} list for the BP Editor's Geo picker — no name resolution.
//
// Loaded at startup and refreshed periodically. In local dev, MSSQL requires
// VPN and being unreachable is expected/benign. In production the service
// runs inside the VPC with direct DB connectivity, so a refresh failure
// there means something is actually broken (network/credentials/DB down) —
// every failure is logged at error level so it surfaces in monitoring, not
// just the first one.

const { getPool } = require('../db');

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // country list changes essentially never

let countries = []; // [{ id, name }], deduped by id, sorted by name
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
    const seen = new Set();
    const list = [];
    for (const row of result.recordset) {
      if (seen.has(row.id)) continue; // first name wins on duplicate aliases per id
      seen.add(row.id);
      list.push({ id: row.id, name: String(row.name).trim() });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    countries = list;
    lastSuccessAt = Date.now();
    consecutiveFailures = 0;
    console.log(`[countryCache] loaded ${list.length} countries from T_COUNTRIES`);
  } catch (err) {
    consecutiveFailures += 1;
    if (!lastSuccessAt) {
      console.error(`[countryCache] ERROR: never loaded — the BP Editor's Geo picker and CID resolution are unavailable. MSSQL/T_COUNTRIES unreachable (attempt ${consecutiveFailures}): ${err.message}`);
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

function listCountries() {
  return countries;
}

module.exports = { start, listCountries };
