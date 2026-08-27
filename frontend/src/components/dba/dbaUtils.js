// Shared helpers for DBA Management screens.

// Brazil (SPA/MF) regulation disclaimer. The full band must occupy ~10% of
// the ad area. The 18+ mark is rendered as a badge next to this sentence
// (not as text). License number comes from the bookmaker's BR variant.
export const BRAZIL_LEGAL_FALLBACK_TEXT =
  'MINISTÉRIO DA FAZENDA ADVERTE: APOSTA NÃO É INVESTIMENTO. AUTORIZAÇÃO SPA/MF. *T&CS SE APLICAM';

/** Default Brazil SPA/MF legal-band footer background. */
export const LEGAL_BAND_BG_DEFAULT = '#000000';

export function brazilDefaultLegalText(licenseNumber) {
  return `MINISTÉRIO DA FAZENDA ADVERTE: APOSTA NÃO É INVESTIMENTO. AUTORIZAÇÃO SPA/MF ${licenseNumber || '[license number]'}. *T&CS SE APLICAM`;
}

export function hexToRgba(hex, a) {
  const c = (hex || '#000').replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function bgCss(config) {
  const type = config.bgType || 'solid';
  if (type === 'gradient') {
    const angle = config.bgAngle ?? 135;
    const a = config.bg || '#151E22';
    const b = config.bg2 || a;
    return `linear-gradient(${angle}deg, ${a}, ${b})`;
  }
  if (type === 'image' && config.bgImage) {
    const op = Math.max(0, Math.min(1, config.bgOverlay ?? 0.35));
    const c = hexToRgba(config.bg || '#000000', op);
    return `linear-gradient(${c}, ${c}), url("${config.bgImage}") center / cover no-repeat`;
  }
  return config.bg;
}

export function invertText(hex) {
  const c = (hex || '#000').replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0A0A0A' : '#FFFFFF';
}

export function relTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function truncateMiddle(str, max = 40) {
  if (!str || str.length <= max) return str;
  const half = Math.floor((max - 3) / 2);
  return str.slice(0, half) + '…' + str.slice(-half);
}

export function fmtBytes(b) {
  if (b > 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
  if (b > 1e3) return (b / 1e3).toFixed(0) + ' KB';
  return b + ' B';
}

export function fmtUptime(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Canonical interstitial size (AdOps GAM inventory). Legacy `640x1280` aliases to the same dims. */
export const INTERSTITIAL_SIZE_ID = '320x480';
export const INTERSTITIAL_SIZE_ALIASES = new Set(['320x480', '640x1280']);

/**
 * Background-image guidelines shown in the DBA template editor.
 * Interstitial art is designed at 2:3; GAM may deliver taller slots that crop via cover.
 */
export const INTERSTITIAL_BG_IMAGE_GUIDELINES = [
  'Preview canvas is 640×1280 (tall device slot). GAM inventory remains 320×480 fluid.',
  'Ratio for art masters: 2:3 (e.g. 640×960 or 1280×1920). Do not rely on full-phone screenshots as the master — tall slots crop via cover.',
  'Format: WebP or JPEG preferred; avoid huge PNGs. Aim under 150–200 KB (ideally under 100 KB).',
  'Applied as center / cover — keep critical art in the middle ~70%. Bottom ~10% is covered by the Brazil legal band.',
  'Set Overlay tint to a solid brand colour that matches the image (fallback while loading + text readability).',
];

export const DEFAULT_BG_IMAGE_GUIDELINES = [
  'Format: WebP or JPEG preferred; avoid huge PNGs. Aim under 150–200 KB.',
  'Applied as center / cover — edges may crop depending on slot size.',
  'Set Overlay tint to a solid brand colour that matches the image (fallback + readability).',
];

export function bgImageGuidelinesForSize(sizeId) {
  return isInterstitialSize(sizeId) ? INTERSTITIAL_BG_IMAGE_GUIDELINES : DEFAULT_BG_IMAGE_GUIDELINES;
}

export function isInterstitialSize(sizeId) {
  return INTERSTITIAL_SIZE_ALIASES.has(sizeId);
}

export function normalizeSizeId(sizeId) {
  if (sizeId === '640x1280') return INTERSTITIAL_SIZE_ID;
  return sizeId;
}

// CMS preview canvas dims. Interstitial inventory is 320×480 (fluid); the
// editor previews a tall device slot at 640×1280 so layout matches Android
// delivery. Legacy `640x1280` sizeId aliases to the same interstitial preview.
export const SIZE_DIMS = {
  '300x250': [300, 250],
  '320x480': [640, 1280],
  '640x1280': [640, 1280],
  '320x50': [320, 50],
};

/** User-facing size label (preview canvas dims — not GAM inventory). */
export function formatSizeLabel(sizeId) {
  const id = normalizeSizeId(sizeId);
  if (id === '300x250') return 'MPU · 300×250';
  if (isInterstitialSize(id)) return 'Interstitial · 640×1280';
  if (id === '320x50') return 'Banner · 320×50';
  const [w, h] = SIZE_DIMS[id] || [];
  return w && h ? `${w}×${h}` : String(sizeId || '');
}

/** Compact WxH for badges — interstitial shows preview canvas, not inventory id. */
export function formatSizeShort(sizeId) {
  const [w, h] = SIZE_DIMS[normalizeSizeId(sizeId)] || SIZE_DIMS[sizeId] || [];
  return w && h ? `${w}×${h}` : String(sizeId || '');
}

/** Default fill used only when the editor's "Date pill fill" toggle is on. */
export const DATE_PILL_FILL_DEFAULT = 'rgba(0,0,0,0.55)';

/** Transparent unless `datePillFill` is explicitly enabled. */
export function resolveDatePillBg(config) {
  if (!config?.datePillFill) return 'transparent';
  return config.datePillColor || DATE_PILL_FILL_DEFAULT;
}

export function resolveDatePillFg(config) {
  return config?.datePillTextColor || config?.text || '#FFFFFF';
}

/** MPU (300×250) layout anchor — keep in sync with backend/gam/templates/mpu-standard.html */
export const MPU_LAYOUT = {
  /** Fixed vertical center (px from ad top). Match carousel centers here; logo hangs above. */
  axisY: 110,
  logoGap: 4,
  /** Counteract axisY lift so the logo stays put while cards move up. Extra +3px nudge down. */
  logoOffsetY: 11,
  sidePad: { default: 14, brazil: 12 },
  logo: {
    default: { w: 51, h: 42 },
    brazil: { w: 70, h: 56 },
  },
  pillPad: { default: 0, brazil: 0 },
  /** Gap between stacked cards. */
  cardGap: { default: 8, brazil: 6 },
};

// Relative luminance (0..1) of a #RRGGBB color. Used to decide whether a
// background is "dark" — we treat anything below 0.5 as dark.
export function isDarkColor(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.5;
}

// For gradient / image backgrounds the "dominant" tint is config.bg, so this
// works for all three background types.
export function isDarkBackground(config) {
  return isDarkColor(config?.bg);
}

// Cascade for picking which logo URL to render in an ad:
//   1. Template config explicitly forces a variant (bg / nobg)
//   2. 'auto' → use NoBG if the background is dark
//   3. 'auto' on a light background → honour the bookmaker's useNoBgLogo
export function resolveLogoUrl(bookmaker, config) {
  if (!bookmaker) return null;
  const variant = config?.logoVariant || 'auto';
  const noBg =
    variant === 'bg'   ? false :
    variant === 'nobg' ? true  :
    /* auto */            (isDarkBackground(config) || !!bookmaker.useNoBgLogo);
  return bookmakerLogoUrl(bookmaker.id, { noBg });
}

// Helper for editor labels — explains *why* Auto resolved the way it did.
export function autoLogoReason(bookmaker, config) {
  if (isDarkBackground(config)) return { noBg: true, reason: 'Dark background' };
  if (bookmaker?.useNoBgLogo)   return { noBg: true, reason: "Bookmaker's default" };
  return { noBg: false, reason: "Bookmaker's default" };
}

// Returns the Cloudinary CDN URL for a bookmaker logo, or null if the id
// doesn't match the expected `bk_<n>` pattern. The transforms keep the image
// at 70×70 with `c_limit` (no upscaling) and a default fallback.
// Pass `{ noBg: true }` to get the transparent-background variant.
const LOGO_TRANSFORMS = 'w_140,h_140,c_limit,d_countries:default.png';
export function bookmakerLogoUrl(id, { noBg = false, transforms = LOGO_TRANSFORMS } = {}) {
  if (id == null) return null;
  const m = String(id).match(/(\d+)$/);
  if (!m) return null;
  const numId = parseInt(m[1], 10);
  const segment = noBg ? `BookMakers/NoBG/${numId}` : `BookMakers/${numId}`;
  return `https://res.cloudinary.com/scores365/image/upload/${transforms}/${segment}`;
}

// Returns the Cloudinary CDN URL for a competitor (team) logo. Same transform
// budget as bookmakers. Accepts an int id (e.g. 1215) or a string ending in
// digits. Returns null when the id is missing — caller falls back to the
// colored-circle crest.
export function competitorLogoUrl(id, { transforms = LOGO_TRANSFORMS } = {}) {
  if (id == null) return null;
  const m = String(id).match(/(\d+)$/);
  if (!m) return null;
  return `https://res.cloudinary.com/scores365/image/upload/${transforms}/Competitors/${parseInt(m[1], 10)}`;
}
