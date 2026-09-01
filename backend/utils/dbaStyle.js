// Visual helpers for DBA GAM export — mirrors frontend src/components/dba/dbaUtils.js.

function hexToRgba(hex, a) {
  const c = (hex || '#000').replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function bgCss(config) {
  if (!config) return '#151E22';
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
  return config.bg || '#151E22';
}

function isDarkColor(hex) {
  if (!hex || typeof hex !== 'string') return true;
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function isDarkBackground(config) {
  return isDarkColor(config?.bg);
}

function invertText(hex) {
  const c = (hex || '#000').replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0A0A0A' : '#FFFFFF';
}

const LOGO_TRANSFORMS = 'w_140,h_140,c_limit,d_countries:default.png';

function bookmakerLogoUrl(id, { noBg = false } = {}) {
  if (id == null) return null;
  const m = String(id).match(/(\d+)$/);
  if (!m) return null;
  const numId = parseInt(m[1], 10);
  const segment = noBg ? `BookMakers/NoBG/${numId}` : `BookMakers/${numId}`;
  return `https://res.cloudinary.com/scores365/image/upload/${LOGO_TRANSFORMS}/${segment}`;
}

function resolveLogoUrl(bookmaker, config) {
  if (!bookmaker) return null;
  const variant = config?.logoVariant || 'auto';
  const noBg =
    variant === 'bg' ? false
      : variant === 'nobg' ? true
        : (isDarkBackground(config) || !!bookmaker.useNoBgLogo);
  if (bookmaker.defaultLogoImageUrl && variant !== 'nobg' && variant !== 'bg') {
    // Prefer stored URL when auto — apply NoBG rewrite for Cloudinary standard paths.
    const url = bookmaker.defaultLogoImageUrl;
    if (noBg && url.indexOf('res.cloudinary.com') !== -1) {
      return url.replace(/(\/BookMakers\/)(?!NoBG\/)/, '$1NoBG/');
    }
    return url;
  }
  return bookmakerLogoUrl(bookmaker.id, { noBg });
}

const DATE_PILL_FILL_DEFAULT = 'rgba(0,0,0,0.55)';

function resolveDatePillBg(config) {
  if (!config?.datePillFill) return 'transparent';
  return config.datePillColor || DATE_PILL_FILL_DEFAULT;
}

function resolveDatePillFg(config) {
  return config?.datePillTextColor || config?.text || '#FFFFFF';
}

const ODDS_BOX_BG_DEFAULT = 'rgba(255,255,255,0.16)';

function resolveOddsBoxBg(config) {
  return config?.oddsBoxColor || ODDS_BOX_BG_DEFAULT;
}

function resolveOddsTextColor(config) {
  return config?.oddsTextColor || config?.text || '#FFFFFF';
}

const CARD_BG_DEFAULT = 'rgba(255,255,255,0.10)';

function resolveCardBg(config) {
  return config?.cardBgColor || CARD_BG_DEFAULT;
}

module.exports = {
  bgCss,
  hexToRgba,
  isDarkColor,
  isDarkBackground,
  invertText,
  bookmakerLogoUrl,
  resolveLogoUrl,
  resolveDatePillBg,
  resolveDatePillFg,
  DATE_PILL_FILL_DEFAULT,
  resolveOddsBoxBg,
  ODDS_BOX_BG_DEFAULT,
  resolveOddsTextColor,
  resolveCardBg,
  CARD_BG_DEFAULT,
};
