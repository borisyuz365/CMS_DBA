// In-memory map of bookmaker BMID → primary brand colour from T_BET_BOOKMAKERS.
// Used by BP runtime to default Strip_Color / Logo_Image_URL when the CMS
// has not stored an override.

const { getPool } = require('../db');

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

// Same CDN pattern the BP Editor preview uses.
const LOGO_BASE =
  'https://imagecache.365scores.com/image/upload/f_webp,w_80,c_limit,q_auto,dpr_2,d_Bookmakers:Round:default.png/v101/Bookmakers/';

/** T_BET_BOOKMAKERS.COLOR is a signed 32-bit ARGB int → #RRGGBB. */
function argbToHex(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (/^#?[0-9A-Fa-f]{6}$/.test(s)) {
    return s.startsWith('#') ? s.toUpperCase() : `#${s.toUpperCase()}`;
  }
  if (/^-?\d+$/.test(s)) {
    const unsigned = parseInt(s, 10) >>> 0;
    const rgb = unsigned & 0xffffff;
    return `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`;
  }
  return null;
}

let byBmid = new Map(); // bmid → { brandColor }
let lastSuccessAt = null;
let consecutiveFailures = 0;

async function refresh() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT BOOKMAKER_ID AS id, COLOR AS color
      FROM T_BET_BOOKMAKERS
      WHERE IS_VISIBLE = 1
    `);
    const next = new Map();
    for (const row of result.recordset) {
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      next.set(id, { brandColor: argbToHex(row.color) });
    }
    byBmid = next;
    lastSuccessAt = Date.now();
    consecutiveFailures = 0;
    console.log(`[bookmakerBrandCache] loaded ${next.size} bookmakers from T_BET_BOOKMAKERS`);
  } catch (err) {
    consecutiveFailures += 1;
    if (!lastSuccessAt) {
      console.error(`[bookmakerBrandCache] ERROR: never loaded — BP strip/logo defaults unavailable (${consecutiveFailures}): ${err.message}`);
    } else {
      const staleMin = Math.round((Date.now() - lastSuccessAt) / 60000);
      console.error(`[bookmakerBrandCache] ERROR: refresh failed, serving ${staleMin}min-stale data (${consecutiveFailures}): ${err.message}`);
    }
  }
}

function start() {
  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
}

function brandColor(bmid) {
  if (bmid == null || bmid === '') return null;
  return byBmid.get(Number(bmid))?.brandColor || null;
}

function logoUrl(bmid) {
  if (bmid == null || bmid === '') return null;
  const id = Number(bmid);
  if (!Number.isFinite(id)) return null;
  return `${LOGO_BASE}${id}`;
}

module.exports = {
  start,
  refresh,
  brandColor,
  logoUrl,
  LOGO_BASE,
};
