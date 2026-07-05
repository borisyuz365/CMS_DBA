// In-memory cache for Betting Promotion (BPMB) data.
//
// All active promotions and their bookies are loaded from MySQL once at
// startup, then refreshed every REFRESH_INTERVAL_MS in the background.
// On refresh failure the previous snapshot is kept — the endpoint never
// goes dark because the DB is momentarily unreachable.
//
// The cache entry shape mirrors the targeting/response structure so that
// the route can filter and serialise without any further DB I/O.

const { pool } = require('../db/mysql');

const REFRESH_INTERVAL_MS = 30_000;

// { versions: [...], builtAt: number } | null
let _cache = null;
let _timer = null;

const LOAD_QUERY = `
  SELECT
    p.id, p.name, p.geo, p.platform, p.lid, p.sov,
    p.page_bg_color,
    p.bg_type, p.bg_gradient_color1, p.bg_gradient_color2,
    p.bg_gradient_angle, p.bg_image_url,
    p.header_main_text,       p.header_main_color,
    p.header_secondary_text,  p.header_secondary_color,
    p.header_image_url,       p.header_image_height,
    p.legal_enabled, p.legal_text, p.legal_color, p.legal_link,
    p.legal_reg_logo1_link, p.legal_reg_logo2_link,
    b.position,       b.bmid,
    b.section_bg_color,
    b.title_text,     b.title_text_color,
    b.cta_text,       b.cta_text_color,
    b.strip_color_1,  b.strip_color_2,
    b.logo_image_url, b.click_url
  FROM bp_promotions p
  LEFT JOIN bp_bookies b ON b.promotion_id = p.id
  WHERE p.active = 1
  ORDER BY p.id, b.position
`;

function buildVersions(rows) {
  const map = new Map();

  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, {
        id:       r.id,
        name:     r.name,
        geo:      r.geo,
        platform: r.platform,
        lid:      r.lid,
        sov:      r.sov,
        pageBgColor:      r.page_bg_color,
        bgType:           r.bg_type || 'solid',
        bgGradientColor1: r.bg_gradient_color1,
        bgGradientColor2: r.bg_gradient_color2,
        bgGradientAngle:  r.bg_gradient_angle,
        bgImageUrl:       r.bg_image_url,
        header: {
          mainTitle:      { text: r.header_main_text,      color: r.header_main_color },
          secondaryTitle: { text: r.header_secondary_text, color: r.header_secondary_color },
          imageUrl:       r.header_image_url,
          imageHeight:    r.header_image_height || 110,
        },
        legal: {
          enabled: !!r.legal_enabled,
          text:    r.legal_text  || '',
          color:   r.legal_color || '#ffffff',
          link:    r.legal_link  || '',
          regulatoryLogos: [
            { src: '/legal-logos/italia-gambling-full.svg',  link: r.legal_reg_logo1_link || '' },
            { src: '/legal-logos/italia-gambling-gauge.svg', link: r.legal_reg_logo2_link || '' },
          ],
        },
        bookies: [],
      });
    }

    if (r.bmid != null) {
      map.get(r.id).bookies.push({
        position:       r.position,
        bmid:           r.bmid,
        sectionBgColor: r.section_bg_color || '#12193A',
        titleText:      r.title_text,
        titleTextColor: r.title_text_color,
        ctaText:        r.cta_text,
        ctaTextColor:   r.cta_text_color,
        stripColors:    [r.strip_color_1, r.strip_color_2].filter(Boolean),
        logoImageUrl:   r.logo_image_url,
        clickUrl:       r.click_url,
      });
    }
  }

  return [...map.values()];
}

async function load() {
  const [rows] = await pool.query(LOAD_QUERY);
  const versions = buildVersions(rows);
  _cache = { versions, builtAt: Date.now() };
  console.log(`[bpCache] loaded ${versions.length} promotion(s)`);
}

function start() {
  load().catch((err) =>
    console.error('[bpCache] initial load failed (serving empty until next refresh):', err.message)
  );
  _timer = setInterval(() => {
    load().catch((err) =>
      console.warn('[bpCache] refresh failed, continuing with stale snapshot:', err.message)
    );
  }, REFRESH_INTERVAL_MS);
  _timer.unref(); // don't block process exit
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

function get() {
  return _cache;
}

// Force an immediate reload (called after a CMS write).
async function invalidate() {
  await load();
}

module.exports = { start, stop, get, invalidate };
