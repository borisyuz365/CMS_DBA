// Country→language and translatable-field helpers for DBA templates.
//
// Language IDs are production T_LANGUAGES.LANGUAGE_ID values (UI languages,
// LANG_TYPE = 1) — the same space as mobile / BP targeting. Do NOT use
// backend/data/languages.json IDs (those diverge, e.g. Italian 8 vs 12).
//
// Live resolution goes through languageCache when MSSQL is available; the
// static map below is the offline fallback (also production IDs).

const languageCache = require('../services/languageCache');

// Country code → production LANGUAGE_ID (fallback when cache is empty).
const COUNTRY_TO_LANG = {
  GLOBAL: 1, US: 1, UK: 1, AU: 1, CA: 1,
  DE: 7,
  ES: 29,
  IT: 12,
  BR: 31,
  AR: 29, MX: 29, CL: 29, CO: 29, EC: 29, PE: 29,
  PL: 35,
};

function countryToLangId(cc) {
  if (!cc) return null;
  const code = String(cc).toUpperCase();
  const live = languageCache.langIdForCountry(code);
  if (live != null) return live;
  return COUNTRY_TO_LANG[code] || null;
}

// Field paths (relative to the template object) that can carry translations.
// Each path resolves to a `<lastSegment>TermId` sibling inside the same object.
// e.g. `config.ctaText` ↔ `config.ctaTextTermId`.
const TRANSLATABLE_PATHS = [
  'name',
  'config.ctaText',
  'config.welcomeOffer.headline',
  'config.welcomeOffer.subtext',
  'config.welcomeOffer.terms',
  'config.welcomeOffer.ctaText',
  'config.legal.text',
];

// Walk an object by dot path; missing intermediate objects are returned as undefined.
function getByPath(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

// Set obj[path] = value, creating intermediate objects when missing.
function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

// "config.ctaText" → "config.ctaTextTermId". For top-level fields like "name",
// the term id sibling lives at the top level too.
function termIdPathFor(path) {
  const parts = path.split('.');
  parts[parts.length - 1] = `${parts[parts.length - 1]}TermId`;
  return parts.join('.');
}

module.exports = {
  COUNTRY_TO_LANG,
  countryToLangId,
  TRANSLATABLE_PATHS,
  getByPath,
  setByPath,
  termIdPathFor,
};
