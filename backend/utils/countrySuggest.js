/**
 * Country suggestion engine for the Terms-Fix page.
 *
 * Given one or more "temp" rows (each with NAME + LANG_ID), compute the
 * top-N existing countries from countries.json whose name (or any of the
 * multi-language values on its term) is most similar to the temp name(s).
 *
 * Matching uses a blend of:
 *   - exact match
 *   - Jaro-Winkler distance (good for short names / typos / prefix matches)
 *   - token-Jaccard overlap (handles noisy temp names like "Germany U21")
 *   - bidirectional substring containment (phrase-in-phrase boost)
 *
 * Language handling: each temp row has a LANG_ID. Country term values in the
 * same language are preferred; English (id=1) is used as a fallback so that
 * non-English temps can still match countries whose only translation happens
 * to be English.
 *
 * Performance: we build an in-memory index of countries (normalized name,
 * code, and per-language term values) that's reused across requests. The
 * index is invalidated automatically when countries.json or terms.json is
 * modified on disk (mtime check) or on demand via `invalidateIndex()`.
 */

const fs = require('fs');
const path = require('path');
const dataLoader = require('./dataLoader');

const DEFAULT_LANG_ID = 1; // English
const COUNTRIES_FILE = 'countries.json';
const TERMS_FILE = 'terms.json';

const dataDir = path.join(__dirname, '../data');

let cached = null; // { mtimeCountries, mtimeTerms, countries: Array<IndexedCountry> }

/**
 * @typedef {object} IndexedTermValue
 * @property {string} norm           Normalized text.
 * @property {number|null} languageId
 * @property {boolean} isDefault
 */

/**
 * @typedef {object} IndexedCountry
 * @property {number} countryId
 * @property {number|null} nameId
 * @property {string} displayName    Original `name` (for UI / reasons).
 * @property {string} normName       Normalized `name`.
 * @property {string|null} normCode  Normalized country code.
 * @property {IndexedTermValue[]} values
 */

/* -------------------------------------------------------------------------- */
/* String utilities                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Lowercase, strip combining diacritics, remove punctuation, collapse
 * whitespace. Non-Latin scripts (Hebrew, Arabic, Cyrillic, CJK, ...) are
 * preserved as-is so they can still match character-for-character.
 */
function normalize(input) {
  if (input == null) return '';
  let s = String(input);
  // Unicode NFD decomposes accented chars into base+combining; then we strip
  // the combining marks (U+0300 - U+036F).
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.toLowerCase();
  // Replace anything that is not a letter/number (in any script) or whitespace
  // with a space. \p{L} and \p{N} need the `u` flag.
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function tokens(normalized) {
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

/**
 * Jaro similarity in [0, 1]. Classic implementation.
 */
function jaro(a, b) {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const aMatches = new Array(la).fill(false);
  const bMatches = new Array(lb).fill(false);

  let matches = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, lb);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / la + matches / lb + (matches - transpositions) / matches) / 3;
}

/**
 * Jaro-Winkler: Jaro plus a prefix-length bonus.
 */
function jaroWinkler(a, b, prefixScale = 0.1, maxPrefix = 4) {
  const j = jaro(a, b);
  if (j <= 0) return 0;
  let l = 0;
  const max = Math.min(maxPrefix, Math.min(a.length, b.length));
  while (l < max && a[l] === b[l]) l++;
  return j + l * prefixScale * (1 - j);
}

/**
 * Jaccard similarity over the token sets.
 */
function jaccard(aTokens, bTokens) {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const set = new Set(aTokens);
  let inter = 0;
  for (const t of bTokens) if (set.has(t)) inter++;
  const union = set.size + bTokens.length - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Combined similarity in [0, 1]. Takes the best of:
 *   - exact (1.0)
 *   - substring containment boost
 *   - Jaro-Winkler on the full strings
 *   - token Jaccard (scaled, since pure token overlap is a looser signal)
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const jw = jaroWinkler(a, b);

  // Substring containment: if one fully contains the other (and they're at
  // least 3 chars), that's a strong signal ("Germany" ⊂ "Germany U21").
  const minLen = Math.min(a.length, b.length);
  const contains = minLen >= 3 && (a.includes(b) || b.includes(a));
  const containsScore = contains ? 0.88 : 0;

  const jac = jaccard(tokens(a), tokens(b));
  const jacScore = jac * 0.9;

  return Math.max(jw, containsScore, jacScore);
}

/* -------------------------------------------------------------------------- */
/* Index build + cache                                                        */
/* -------------------------------------------------------------------------- */

async function mtime(file) {
  try {
    const st = await fs.promises.stat(path.join(dataDir, file));
    return st.mtimeMs;
  } catch {
    return 0;
  }
}

async function buildIndex() {
  const [countries, terms] = await Promise.all([
    dataLoader.loadData(COUNTRIES_FILE),
    dataLoader.loadData(TERMS_FILE),
  ]);

  const termsById = new Map();
  for (const t of terms || []) {
    if (t && t.id != null) termsById.set(Number(t.id), t);
  }

  const indexed = [];
  for (const c of countries || []) {
    if (!c || c.IS_DELETED) continue;
    const countryId = Number(c.COUNTRY_ID);
    if (!Number.isFinite(countryId)) continue;

    const term = c.NAME_ID != null ? termsById.get(Number(c.NAME_ID)) : null;
    const values = [];
    if (term && Array.isArray(term.values)) {
      for (const v of term.values) {
        const norm = normalize(v.value);
        if (!norm) continue;
        values.push({
          norm,
          languageId: v.languageId != null ? Number(v.languageId) : null,
          isDefault: Boolean(v.isDefault),
        });
      }
    }

    indexed.push({
      countryId,
      nameId: c.NAME_ID != null ? Number(c.NAME_ID) : null,
      displayName: String(c.name || '').trim(),
      normName: normalize(c.name),
      normCode: normalize(c.COUNTRY_CODE) || null,
      values,
    });
  }

  return indexed;
}

async function getIndex() {
  const [mc, mt] = await Promise.all([mtime(COUNTRIES_FILE), mtime(TERMS_FILE)]);
  if (cached && cached.mtimeCountries === mc && cached.mtimeTerms === mt) {
    return cached.countries;
  }
  const countries = await buildIndex();
  cached = { mtimeCountries: mc, mtimeTerms: mt, countries };
  return countries;
}

function invalidateIndex() {
  cached = null;
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

// Per-language weighting for term-value candidates. Same-language beats the
// English fallback, which in turn beats any other arbitrary language.
const SAME_LANG_BOOST = 1.05;
const DEFAULT_LANG_WEIGHT = 1.0;
const OTHER_LANG_WEIGHT = 0.9;

/**
 * Score a single temp row against a single indexed country. Returns the
 * best candidate match found (highest adjusted score).
 *
 * @param {string} normQuery  Normalized temp NAME.
 * @param {number|null} queryLang  Temp LANG_ID (or null).
 * @param {IndexedCountry} country
 * @param {number} defaultLanguageId
 * @returns {{ score: number, matchedText: string, matchedLang: number|null, kind: string }}
 */
function scoreCountry(normQuery, queryLang, country, defaultLanguageId) {
  let best = { score: 0, matchedText: '', matchedLang: null, kind: 'none' };

  const consider = (text, lang, kind, weight) => {
    if (!text) return;
    const s = similarity(normQuery, text) * weight;
    if (s > best.score) {
      best = { score: s, matchedText: text, matchedLang: lang, kind };
    }
  };

  // `name` is English by convention here - weight it as default-language.
  consider(country.normName, defaultLanguageId, 'name', DEFAULT_LANG_WEIGHT);
  // Country code (e.g. "de"). Only meaningful for short queries; similarity
  // naturally downweights long queries vs 2-char codes.
  consider(country.normCode, null, 'code', DEFAULT_LANG_WEIGHT);

  for (const v of country.values) {
    let weight = OTHER_LANG_WEIGHT;
    if (queryLang != null && v.languageId === queryLang) {
      weight = SAME_LANG_BOOST;
    } else if (v.languageId === defaultLanguageId || v.isDefault) {
      weight = DEFAULT_LANG_WEIGHT;
    }
    consider(v.norm, v.languageId, 'term', weight);
  }

  // Cap at 1.0 so the UI can safely render it as a percentage.
  if (best.score > 1) best.score = 1;
  return best;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Suggest the top-N matching countries for one or more temp rows.
 *
 * When multiple temp rows are supplied, per-country scores are **averaged**
 * across rows. This matches the typical many-to-one workflow where the user
 * selects several spellings of the same underlying country and expects the
 * suggestions to favor the country that matches them all.
 *
 * @param {Array<{ NAME?: string, LANG_ID?: number|string }>} tempRows
 * @param {object} [options]
 * @param {number} [options.limit=3]
 * @param {number} [options.defaultLanguageId=1]
 * @param {number} [options.minLength=4] Minimum normalized query length;
 *                                        rows shorter than this are skipped.
 * @returns {Promise<Array<{
 *   countryId: number,
 *   score: number,
 *   reason: { tempIndex: number, matchedText: string, matchedLang: number|null, kind: string, perRowScore: number }
 * }>>}
 */
async function suggestCountries(tempRows, options = {}) {
  const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
  const defaultLanguageId = Number(options.defaultLanguageId) || DEFAULT_LANG_ID;
  const minLength = Number(options.minLength) >= 0 ? Number(options.minLength) : 4;

  const queries = (Array.isArray(tempRows) ? tempRows : [])
    .map((r, i) => ({
      index: i,
      norm: normalize(r?.NAME),
      lang: r?.LANG_ID != null && Number.isFinite(Number(r.LANG_ID)) ? Number(r.LANG_ID) : null,
    }))
    .filter((q) => q.norm.length >= minLength);

  if (queries.length === 0) return [];

  const countries = await getIndex();

  const aggregates = new Map(); // countryId -> { sum, count, bestReason }

  for (const country of countries) {
    let sum = 0;
    let count = 0;
    let bestReason = null;

    for (const q of queries) {
      const match = scoreCountry(q.norm, q.lang, country, defaultLanguageId);
      sum += match.score;
      count += 1;
      if (!bestReason || match.score > bestReason.perRowScore) {
        bestReason = {
          tempIndex: q.index,
          matchedText: match.matchedText,
          matchedLang: match.matchedLang,
          kind: match.kind,
          perRowScore: match.score,
        };
      }
    }

    if (count === 0) continue;
    aggregates.set(country.countryId, { score: sum / count, bestReason });
  }

  const countryMap = new Map();
  for (const c of countries) countryMap.set(c.countryId, c);

  const all = Array.from(aggregates.entries()).map(([countryId, agg]) => ({
    countryId,
    name: countryMap.get(countryId)?.displayName || '',
    code: countryMap.get(countryId)?.normCode || '',
    score: agg.score,
    reason: agg.bestReason,
  }));

  all.sort((a, b) => b.score - a.score);
  return all.slice(0, limit);
}

module.exports = {
  suggestCountries,
  invalidateIndex,
  // Exposed for tests / debugging:
  _internals: { normalize, jaroWinkler, similarity },
};
