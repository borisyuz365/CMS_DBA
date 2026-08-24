// Flat runtime JSON for GET /api/bp (mobile clients).
// Shared by bp-service; CMS Swagger references the same shape.
//
// All colour fields are normalised to uppercase #RRGGBB hex before return.
// rgb/rgba (and short hex) are converted; semi-transparent rgba is composited
// onto black so clients (e.g. Android Color.parseColor) always get opaque hex.
//
// Logo_Image_URL defaults to the bookmaker CDN round logo (no DB required).
// Strip_Color uses the CMS override when set; optional brand-colour fallback
// from bookmakerBrandCache when that module is available (CMS process only —
// bp-service intentionally has no MSSQL; do not hard-require the cache here).

const ITALY_CID = 3;
const PLATFORM_BY_APP_TYPE = { '1': 'iOS', '2': 'Android' };

// Same CDN pattern as the BP Editor preview / bookmakerBrandCache.
const LOGO_BASE =
  'https://imagecache.365scores.com/image/upload/f_webp,w_80,c_limit,q_auto,dpr_2,d_Bookmakers:Round:default.png/v101/Bookmakers/';

let brandCache = null;
try {
  // Optional — present in CMS image; absent from lean bp-service image.
  brandCache = require('../bookmakerBrandCache');
} catch {
  brandCache = null;
}

function parseOptionalInt(val) {
  if (val == null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function absolutizeAssetUrl(pathOrUrl) {
  if (!pathOrUrl || /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (process.env.BP_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return base ? `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}` : pathOrUrl;
}

function byteToHex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

function rgbToHex(r, g, b) {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

/** Composite rgba over black → opaque #RRGGBB (mobile-safe). */
function rgbaToHex(r, g, b, a) {
  const alpha = Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1;
  return rgbToHex(r * alpha, g * alpha, b * alpha);
}

const NAMED_HEX = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  transparent: '#000000',
};

/**
 * Normalise any CSS colour string to uppercase #RRGGBB.
 * Returns null for null/empty input. Unrecognised values are returned unchanged
 * (trimmed) so we never invent a colour silently.
 *
 * Tolerates truncated rgba strings (legacy colour-field maxLength bugs),
 * e.g. "rgba(255,255,255,0.6" without a closing paren.
 */
function toHexColor(input) {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const named = NAMED_HEX[raw.toLowerCase()];
  if (named) return named;

  // #RGB / #RRGGBB / #RRGGBBAA (drop alpha → opaque RGB)
  const hexMatch = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 8) h = h.slice(0, 6); // ignore CSS AA suffix
    return `#${h.toUpperCase()}`;
  }

  // rgb(r,g,b) / rgba(r,g,b,a) — optional closing paren (truncated legacy values)
  const rgbMatch = raw.match(
    /^rgba?\(\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)\s*(?:,\s*([0-9.]+)\s*)?\)?\s*$/i
  );
  if (rgbMatch) {
    const channel = (v) => {
      if (String(v).endsWith('%')) return (parseFloat(v) / 100) * 255;
      return parseFloat(v);
    };
    const r = channel(rgbMatch[1]);
    const g = channel(rgbMatch[2]);
    const b = channel(rgbMatch[3]);
    if ([r, g, b].some((n) => !Number.isFinite(n))) return raw;
    if (rgbMatch[4] != null && rgbMatch[4] !== '') {
      return rgbaToHex(r, g, b, parseFloat(rgbMatch[4]));
    }
    return rgbToHex(r, g, b);
  }

  return raw;
}

/** Like toHexColor, but returns null unless the result is a real #RRGGBB hex. */
function toHexColorOrNull(input) {
  const hex = toHexColor(input);
  if (hex && /^#[0-9A-F]{6}$/.test(hex)) return hex;
  return null;
}

function defaultLogoUrl(bmid) {
  if (bmid == null || bmid === '') return null;
  const id = Number(bmid);
  if (!Number.isFinite(id)) return null;
  return `${LOGO_BASE}${id}`;
}

function resolveStripColor(bookie) {
  const override = bookie.stripColor
    || (Array.isArray(bookie.stripColors) ? bookie.stripColors[0] : null);
  const fromCms = toHexColorOrNull(override);
  if (fromCms) return fromCms;
  return brandCache?.brandColor(bookie.bmid) || null;
}

function resolveLogoUrl(bookie) {
  const override = bookie.logoImageUrl ? String(bookie.logoImageUrl).trim() : '';
  if (override) return absolutizeAssetUrl(override);
  return brandCache?.logoUrl(bookie.bmid) || defaultLogoUrl(bookie.bmid);
}

function formatVersion(v, { uc } = {}) {
  const requestUc = parseOptionalInt(uc);
  return {
    BP_Version_Name:    v.name,
    Num_Of_Bookies:     v.bookies.length,
    Targeting: {
      uc: requestUc,
      LID: v.lid,
      SOV: v.sov,
      Lang: v.lang,
      Publisher: v.publisher,
      Campaign: v.campaign,
    },
    Header: {
      Main_Title:      {
        Text:  v.header.mainTitle.text,
        Color: toHexColor(v.header.mainTitle.color),
      },
      Secondary_Title: {
        Text:  v.header.secondaryTitle.text,
        Color: toHexColor(v.header.secondaryTitle.color),
      },
      ImageURL:        absolutizeAssetUrl(v.header.imageUrl),
    },
    Page_Background_Color: toHexColor(v.pageBgColor),
    Page_Background: {
      Type:           v.bgType || 'solid',
      Color:          toHexColor(v.pageBgColor),
      GradientColor1: toHexColorOrNull(v.bgGradientColor1),
      GradientColor2: toHexColorOrNull(v.bgGradientColor2),
      GradientAngle:  v.bgGradientAngle,
      ImageUrl:       absolutizeAssetUrl(v.bgImageUrl),
    },
    Legal: v.legal?.enabled ? {
      Text:  v.legal.text,
      Color: toHexColor(v.legal.color),
      Link:  v.legal.link,
      Regulatory_Logos: requestUc === ITALY_CID
        ? v.legal.regulatoryLogos.map((l) => ({
            Src: absolutizeAssetUrl(l.src),
            Link: l.link,
          }))
        : undefined,
    } : null,
    Bookies: v.bookies.map((b) => ({
      BMID:             b.bmid,
      Section_BG_Color: toHexColor(b.sectionBgColor),
      Title_Text:       b.titleText,
      Title_Text_Color: toHexColor(b.titleTextColor),
      Subtitle_Text:       b.subtitleText,
      Subtitle_Text_Color: toHexColorOrNull(b.subtitleTextColor),
      CTA_Text:         b.ctaText,
      CTA_Text_Color:   toHexColor(b.ctaTextColor),
      Strip_Color:      resolveStripColor(b),
      Click_URL:        b.clickUrl,
      Logo_Image_URL:   resolveLogoUrl(b),
    })),
  };
}

module.exports = {
  ITALY_CID,
  PLATFORM_BY_APP_TYPE,
  parseOptionalInt,
  absolutizeAssetUrl,
  toHexColor,
  toHexColorOrNull,
  formatVersion,
};
