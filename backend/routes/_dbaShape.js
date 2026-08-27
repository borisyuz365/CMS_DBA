// Helpers that convert between MySQL row shapes and the JSON shapes the
// frontend already consumes. Keeps the column-name ↔ camelCase translation
// in one place so the routes stay readable.
const { normalizeSizeId, INTERSTITIAL_SIZE_ID } = require('../utils/dbaSizes');

function isoOrNull(d) {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

// Many JSON columns come back already-parsed from mysql2, but the driver
// occasionally hands them back as strings depending on the column type and
// MySQL version. Be defensive.
function parseMaybeJson(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

function bookmakerRowToJson(row, variantRows) {
  return {
    id: row.id,
    name: row.name,
    brandColor:              row.brand_color,
    secondaryColor:          row.secondary_color,
    logoBg:                  row.logo_bg,
    logoFg:                  row.logo_fg,
    initials:                row.initials,
    defaultLogoImageUrl:     row.default_logo_image_url,
    defaultLogoImageUrlNoBg: row.default_logo_image_url_no_bg,
    useNoBgLogo:             !!row.use_no_bg_logo,
    dedicatedLogo:           parseMaybeJson(row.dedicated_logo),
    variants: Object.fromEntries(
      (variantRows || []).map((v) => [
        v.country_code,
        {
          affiliate:     v.affiliate,
          licenseNumber: v.license_number,
          status:        v.status,
          modified:      isoOrNull(v.modified),
          modifiedBy:    v.modified_by,
        },
      ]),
    ),
  };
}

function templateRowToJson(row, countries = []) {
  // Legacy interstitial id 640x1280 → AdOps inventory 320x480 (preview canvas 640×1280).
  const sizeId = normalizeSizeId(row.size_id);
  const sizeLabel = sizeId === INTERSTITIAL_SIZE_ID
    ? 'Interstitial · 640×1280'
    : (row.size_label || sizeId);
  return {
    id: row.id,
    name: row.name,
    sizeId,
    size: sizeLabel,
    status: row.status,
    bookmakerId: row.bookmaker_id,
    config: parseMaybeJson(row.config) || {},
    countries,
    modified: isoOrNull(row.modified),
    modifiedBy: row.modified_by,
  };
}

function auditRowToJson(row) {
  return {
    kind: row.kind,
    who: row.who,
    // The DB column is named `occurred_at` (because `when` is reserved).
    when: isoOrNull(row.occurred_at),
    text: row.text,
  };
}

module.exports = {
  isoOrNull,
  parseMaybeJson,
  bookmakerRowToJson,
  templateRowToJson,
  auditRowToJson,
};
