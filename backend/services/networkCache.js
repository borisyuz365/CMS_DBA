// In-memory cache of attribution networks (publisher names), sourced from
// production T_PUBLISHERS (MSSQL SportifierDB).
//
// The mobile API `publisher` query param is T_PUBLISHERS.ALIAS_NAME — the
// network the user came from — not PUBLISHER_ID. BP targeting stores and
// matches on that string.

const { getPool } = require('../db');

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let networks = []; // [{ id, name }] where name = ALIAS_NAME
let lastSuccessAt = null;
let consecutiveFailures = 0;

async function refresh() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        PUBLISHER_ID AS id,
        ALIAS_NAME   AS name
      FROM T_PUBLISHERS
      WHERE ALIAS_NAME IS NOT NULL
        AND ALIAS_NAME <> ''
        AND IS_ACTIVE = 1
      ORDER BY ALIAS_NAME
    `);
    const seen = new Set();
    const list = [];
    for (const row of result.recordset) {
      const name = String(row.name).trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      list.push({ id: row.id, name });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    networks = list;
    lastSuccessAt = Date.now();
    consecutiveFailures = 0;
    console.log(`[networkCache] loaded ${list.length} networks from T_PUBLISHERS`);
  } catch (err) {
    consecutiveFailures += 1;
    if (!lastSuccessAt) {
      console.error(`[networkCache] ERROR: never loaded — BP network picker unavailable. MSSQL/T_PUBLISHERS unreachable (attempt ${consecutiveFailures}): ${err.message}`);
    } else {
      const staleMinutes = Math.round((Date.now() - lastSuccessAt) / 60000);
      console.error(`[networkCache] ERROR: refresh failed, serving ${staleMinutes}min-stale data (${consecutiveFailures} consecutive failures): ${err.message}`);
    }
  }
}

function start() {
  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
}

function listNetworks() {
  return networks;
}

function nameById(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return networks.find((row) => row.id === n)?.name || null;
}

module.exports = { start, listNetworks, nameById };
