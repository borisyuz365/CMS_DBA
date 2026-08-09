// Brazil (SPA/MF) regulation disclaimer helpers.
// Keep in sync with frontend/src/components/dba/dbaUtils.js.
// The 18+ mark is rendered as a badge beside this sentence (not as text).

const BRAZIL_LEGAL_FALLBACK_TEXT =
  'MINISTÉRIO DA FAZENDA ADVERTE: APOSTA NÃO É INVESTIMENTO. AUTORIZAÇÃO SPA/MF. *T&CS SE APLICAM';

const LEGAL_BAND_BG_DEFAULT = 'rgba(0, 0, 0, 0.72)';

function brazilDefaultLegalText(licenseNumber) {
  return `MINISTÉRIO DA FAZENDA ADVERTE: APOSTA NÃO É INVESTIMENTO. AUTORIZAÇÃO SPA/MF ${licenseNumber || '[license number]'}. *T&CS SE APLICAM`;
}

module.exports = { BRAZIL_LEGAL_FALLBACK_TEXT, LEGAL_BAND_BG_DEFAULT, brazilDefaultLegalText };
