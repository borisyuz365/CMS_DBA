/** Canonical DBA size ids and interstitial migration helpers. */

const INTERSTITIAL_SIZE_ID = '320x480';
const INTERSTITIAL_ALIASES = new Set(['320x480', '640x1280']);

function isInterstitialSize(sizeId) {
  return INTERSTITIAL_ALIASES.has(sizeId);
}

/** Map legacy interstitial id to the AdOps inventory size. */
function normalizeSizeId(sizeId) {
  if (sizeId === '640x1280') return INTERSTITIAL_SIZE_ID;
  return sizeId;
}

function placementForSize(sizeId) {
  const id = normalizeSizeId(sizeId);
  return ({ '300x250': 'MPU', '320x50': 'Banner', '320x480': 'Interstitial' })[id] || 'Interstitial';
}

module.exports = {
  INTERSTITIAL_SIZE_ID,
  INTERSTITIAL_ALIASES,
  isInterstitialSize,
  normalizeSizeId,
  placementForSize,
};
