/**
 * Competition suggestion engine for the Terms-Fix page.
 *
 * Given one or more "temp" rows (each with NAME + LANG_ID), compute the
 * top-N existing competitions from competitions.json whose name (or any of
 * the multi-language values on its term) is most similar to the temp name(s).
 *
 * Supports an optional `countryIds` filter to restrict results to competitions
 * belonging to specific countries.
 *
 * Reuses the same string-similarity primitives from countrySuggest.
 */

const fs = require('fs');
const path = require('path');
const dataLoader = require('./dataLoader');
const { _internals: { normalize, similarity } } = require('./countrySuggest');

const DEFAULT_LANG_ID = 1;
const COMPETITIONS_FILE = 'competitions.json';
const TERMS_FILE = 'terms.json';

const dataDir = path.join(__dirname, '../data');

let cached = null;

async function mtime(file) {
  try {
    const st = await fs.promises.stat(path.join(dataDir, file));
    return st.mtimeMs;
  } catch {
    return 0;
  }
}

async function buildIndex() {
  const [competitions, terms] = await Promise.all([
    dataLoader.loadData(COMPETITIONS_FILE),
    dataLoader.loadData(TERMS_FILE),
  ]);

  const termsById = new Map();
  for (const t of terms || []) {
    if (t && t.id != null) termsById.set(Number(t.id), t);
  }

  const indexed = [];
  for (const c of competitions || []) {
    if (!c || c.IS_DELETED) continue;
    const competitionId = Number(c.COMPETITION_ID);
    if (!Number.isFinite(competitionId)) continue;

    const countryId = c.COUNTRY_ID != null ? Number(c.COUNTRY_ID) : null;
    const sportTypeId = c.SPORT_TYPE_ID != null ? Number(c.SPORT_TYPE_ID) : null;

    const term = c.NAME_ID != null ? termsById.get(Number(c.NAME_ID)) : null;
    const values = [];
    let displayName = `Competition ${competitionId}`;

    if (term && Array.isArray(term.values)) {
      for (const v of term.values) {
        const norm = normalize(v.value);
        if (!norm) continue;
        values.push({
          norm,
          languageId: v.languageId != null ? Number(v.languageId) : null,
          isDefault: Boolean(v.isDefault),
        });
        if (v.isDefault || (displayName.startsWith('Competition ') && Number(v.languageId) === DEFAULT_LANG_ID)) {
          displayName = String(v.value || '').trim();
        }
      }
    }

    indexed.push({
      competitionId,
      countryId,
      sportTypeId,
      nameId: c.NAME_ID != null ? Number(c.NAME_ID) : null,
      displayName,
      values,
    });
  }

  return indexed;
}

async function getIndex() {
  const [mc, mt] = await Promise.all([mtime(COMPETITIONS_FILE), mtime(TERMS_FILE)]);
  if (cached && cached.mtimeCompetitions === mc && cached.mtimeTerms === mt) {
    return cached.competitions;
  }
  const competitions = await buildIndex();
  cached = { mtimeCompetitions: mc, mtimeTerms: mt, competitions };
  return competitions;
}

function invalidateIndex() {
  cached = null;
}

const SAME_LANG_BOOST = 1.05;
const DEFAULT_LANG_WEIGHT = 1.0;
const OTHER_LANG_WEIGHT = 0.9;

function scoreCompetition(normQuery, queryLang, competition, defaultLanguageId) {
  let best = { score: 0, matchedText: '', matchedLang: null, kind: 'none' };

  const consider = (text, lang, kind, weight) => {
    if (!text) return;
    const s = similarity(normQuery, text) * weight;
    if (s > best.score) {
      best = { score: s, matchedText: text, matchedLang: lang, kind };
    }
  };

  for (const v of competition.values) {
    let weight = OTHER_LANG_WEIGHT;
    if (queryLang != null && v.languageId === queryLang) {
      weight = SAME_LANG_BOOST;
    } else if (v.languageId === defaultLanguageId || v.isDefault) {
      weight = DEFAULT_LANG_WEIGHT;
    }
    consider(v.norm, v.languageId, 'term', weight);
  }

  if (best.score > 1) best.score = 1;
  return best;
}

/**
 * Suggest the top-N matching competitions for one or more temp rows.
 *
 * @param {Array<{ NAME?: string, LANG_ID?: number }>} tempRows
 * @param {object} [options]
 * @param {number} [options.limit=3]
 * @param {number} [options.defaultLanguageId=1]
 * @param {number} [options.minLength=4]
 * @param {number[]} [options.countryIds=[]] When non-empty, only competitions
 *   whose COUNTRY_ID is in this list are considered.
 */
async function suggestCompetitions(tempRows, options = {}) {
  const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
  const defaultLanguageId = Number(options.defaultLanguageId) || DEFAULT_LANG_ID;
  const minLength = Number(options.minLength) >= 0 ? Number(options.minLength) : 4;
  const countryIds = Array.isArray(options.countryIds) ? new Set(options.countryIds) : new Set();

  const queries = (Array.isArray(tempRows) ? tempRows : [])
    .map((r, i) => ({
      index: i,
      norm: normalize(r?.NAME),
      lang: r?.LANG_ID != null && Number.isFinite(Number(r.LANG_ID)) ? Number(r.LANG_ID) : null,
    }))
    .filter((q) => q.norm.length >= minLength);

  if (queries.length === 0) return [];

  const competitions = await getIndex();

  const aggregates = new Map();

  for (const comp of competitions) {
    if (countryIds.size > 0 && (comp.countryId == null || !countryIds.has(comp.countryId))) {
      continue;
    }

    let sum = 0;
    let count = 0;
    let bestReason = null;

    for (const q of queries) {
      const match = scoreCompetition(q.norm, q.lang, comp, defaultLanguageId);
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
    aggregates.set(comp.competitionId, { score: sum / count, bestReason });
  }

  const compMap = new Map();
  for (const c of competitions) compMap.set(c.competitionId, c);

  const all = Array.from(aggregates.entries()).map(([competitionId, agg]) => ({
    competitionId,
    name: compMap.get(competitionId)?.displayName || '',
    score: agg.score,
    reason: agg.bestReason,
  }));

  all.sort((a, b) => b.score - a.score);
  return all.slice(0, limit);
}

module.exports = {
  suggestCompetitions,
  invalidateIndex,
};
