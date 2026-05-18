// GET /api/dba/bookmaker-pool
// Returns visible bookmakers from T_BET_BOOKMAKERS for use in the
// "Add Bookmaker" picker. Shape matches DBA_BOOKMAKER_POOL on the frontend:
//   { id, name, defaultLogo: { bg, fg, initials } }
const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

const FALLBACK_PALETTE = [
  { bg: '#FFCC00', fg: '#0A0A0A' }, { bg: '#1B3970', fg: '#FFFFFF' },
  { bg: '#53D337', fg: '#0A0A0A' }, { bg: '#1493FF', fg: '#FFFFFF' },
  { bg: '#BB9457', fg: '#0A0A0A' }, { bg: '#003B71', fg: '#D4AF37' },
  { bg: '#14805E', fg: '#FFFFFF' }, { bg: '#E50914', fg: '#FFFFFF' },
  { bg: '#00A826', fg: '#0A0A0A' }, { bg: '#D40000', fg: '#FFFFFF' },
  { bg: '#FCE205', fg: '#0A0A0A' }, { bg: '#FF6900', fg: '#FFFFFF' },
];

function paletteFor(id) {
  return FALLBACK_PALETTE[Math.abs(parseInt(id, 10)) % FALLBACK_PALETTE.length];
}

function initialsFromName(name) {
  if (!name) return 'BM';
  const clean = name.replace(/[^A-Za-z0-9 ]/g, '').trim();
  if (!clean) return 'BM';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 3).toUpperCase();
}

// T_BET_BOOKMAKERS.COLOR / SECONDARY_COLOR are signed 32-bit ARGB ints
// (e.g. Bet365 = -16745637 = 0xFF007B5B → #007B5B).
function asHex(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  // Accept "#RRGGBB" or "RRGGBB"
  if (/^#?[0-9A-Fa-f]{6}$/.test(s)) return s.startsWith('#') ? s.toUpperCase() : ('#' + s.toUpperCase());
  // Signed/unsigned decimal int — interpret as ARGB and drop the alpha byte.
  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (Number.isNaN(n)) return null;
    const unsigned = n >>> 0;       // signed → unsigned 32-bit
    const rgb = unsigned & 0xFFFFFF; // strip alpha
    return '#' + rgb.toString(16).padStart(6, '0').toUpperCase();
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        bm.BOOKMAKER_ID                       AS id,
        dvName.VALUE                          AS name,
        bm.COLOR                              AS color,
        bm.SECONDARY_COLOR                    AS secondaryColor
      FROM T_BET_BOOKMAKERS bm
      LEFT JOIN T_DICT_VALUES dvName ON dvName.TERM_ID = bm.NAME_ID AND dvName.LANG_ID = 1
      WHERE bm.IS_VISIBLE = 1
        AND dvName.VALUE IS NOT NULL
      ORDER BY dvName.VALUE
    `);

    const out = result.recordset.map((r) => {
      const primary   = asHex(r.color);
      const secondary = asHex(r.secondaryColor);
      const swatch = primary ? { bg: primary, fg: '#FFFFFF' } : paletteFor(r.id);
      const base = 'https://res.cloudinary.com/scores365/image/upload/w_140,h_140,c_limit,d_countries:default.png';
      return {
        id: `bk_${r.id}`,
        name: r.name,
        // Brand colours straight from T_BET_BOOKMAKERS — null if missing.
        brandColor:     primary,
        secondaryColor: secondary,
        defaultLogo: {
          ...swatch,
          initials: initialsFromName(r.name),
          imageUrl:     `${base}/BookMakers/${r.id}`,
          imageUrlNoBg: `${base}/BookMakers/NoBG/${r.id}`,
        },
      };
    });
    res.json(out);
  } catch (err) {
    console.error('[bookmaker-pool] query failed:', err.message);
    res.status(503).json({
      error: 'Bookmaker pool unavailable',
      detail: err.message,
      hint: 'Check VPN / DB credentials in backend/.env',
    });
  }
});

module.exports = router;
