/**
 * Competitor suggestion engine for the Terms-Fix page.
 *
 * Given one or more "temp" rows (each with NAME + LANG_ID), compute the
 * top-N existing competitors from competitors.json whose name (or any of
 * the multi-language values on its term) is most similar to the temp name(s).
 *
 * Supports an optional `countryIds` filter to restrict results to competitors
 * belonging to specific countries.
 *
 * Reuses the same string-similarity primitives from countrySuggest.
 */

const fs = require('fs');
const path = require('path');
const dataLoader = require('./dataLoader');
const { _internals: { normalize, similarity } } = require('./countrySuggest');

const DEFAULT_LANG_ID = 1;
const COMPETITORS_FILE = 'competitors.json';
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
  const [competitors, terms] = await Promise.all([
    dataLoader.loadData(COMPETITORS_FILE),
    dataLoader.loadData(TERMS_FILE),
  ]);

  const termsById = new Map();
  for (const t of terms || []) {
    if (t && t.id != null) termsById.set(Number(t.id), t);
  }

  const indexed = [];
  for (const c of competitors || []) {
    if (!c || c.IS_DELETED) continue;
    const competitorId = Number(c.COMPETITOR_ID);
    if (!Number.isFinite(competitorId)) continue;

    const countryId = c.COUNTRY_ID != null ? Number(c.COUNTRY_ID) : null;
    const sportTypeId = c.SPORT_TYPE_ID != null ? Number(c.SPORT_TYPE_ID) : null;

    const term = c.NAME_ID != null ? termsById.get(Number(c.NAME_ID)) : null;
    const values = [];
    let displayName = `Competitor ${competitorId}`;

    if (term && Array.isArray(term.values)) {
      for (const v of term.values) {
        const norm = normalize(v.value);
        if (!norm) continue;
        values.push({
          norm,
          languageId: v.languageId != null ? Number(v.languageId) : null,
          isDefault: Boolean(v.isDefault),
        });
        if (v.isDefault || (displayName.startsWith('Competitor ') && Number(v.languageId) === DEFAULT_LANG_ID)) {
          displayName = String(v.value || '').trim();
        }
      }
    }

    const mainCompetition = c.MAIN_COMPETITION != null ? Number(c.MAIN_COMPETITION) : null;

    indexed.push({
      competitorId,
      countryId,
      sportTypeId,
      mainCompetition,
      nameId: c.NAME_ID != null ? Number(c.NAME_ID) : null,
      displayName,
      values,
    });
  }

  return indexed;
}

async function getIndex() {
  const [mc, mt] = await Promise.all([mtime(COMPETITORS_FILE), mtime(TERMS_FILE)]);
  if (cached && cached.mtimeCompetitors === mc && cached.mtimeTerms === mt) {
    return cached.competitors;
  }
  const competitors = await buildIndex();
  cached = { mtimeCompetitors: mc, mtimeTerms: mt, competitors };
  return competitors;
}

function invalidateIndex() {
  cached = null;
}

const SAME_LANG_BOOST = 1.05;
const DEFAULT_LANG_WEIGHT = 1.0;
const OTHER_LANG_WEIGHT = 0.9;

function scoreCompetitor(normQuery, queryLang, competitor, defaultLanguageId) {
  let best = { score: 0, matchedText: '', matchedLang: null, kind: 'none' };

  const consider = (text, lang, kind, weight) => {
    if (!text) return;
    const s = similarity(normQuery, text) * weight;
    if (s > best.score) {
      best = { score: s, matchedText: text, matchedLang: lang, kind };
    }
  };

  for (const v of competitor.values) {
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
 * Suggest the top-N matching competitors for one or more temp rows.
 *
 * @param {Array<{ NAME?: string, LANG_ID?: number }>} tempRows
 * @param {object} [options]
 * @param {number} [options.limit=3]
 * @param {number} [options.defaultLanguageId=1]
 * @param {number} [options.minLength=4]
 * @param {number[]} [options.countryIds=[]] When non-empty, only competitors
 *   whose COUNTRY_ID is in this list are considered.
 * @param {number[]} [options.competitionIds=[]] When non-empty, only competitors
 *   whose MAIN_COMPETITION is in this list are considered.
 */
async function suggestCompetitors(tempRows, options = {}) {
  const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
  const defaultLanguageId = Number(options.defaultLanguageId) || DEFAULT_LANG_ID;
  const minLength = Number(options.minLength) >= 0 ? Number(options.minLength) : 4;
  const countryIds = Array.isArray(options.countryIds) ? new Set(options.countryIds) : new Set();
  const competitionIds = Array.isArray(options.competitionIds) ? new Set(options.competitionIds) : new Set();

  const queries = (Array.isArray(tempRows) ? tempRows : [])
    .map((r, i) => ({
      index: i,
      norm: normalize(r?.NAME),
      lang: r?.LANG_ID != null && Number.isFinite(Number(r.LANG_ID)) ? Number(r.LANG_ID) : null,
    }))
    .filter((q) => q.norm.length >= minLength);

  if (queries.length === 0) return [];

  const competitors = await getIndex();

  const aggregates = new Map();

  for (const comp of competitors) {
    if (countryIds.size > 0 && (comp.countryId == null || !countryIds.has(comp.countryId))) {
      continue;
    }
    if (competitionIds.size > 0 && (comp.mainCompetition == null || !competitionIds.has(comp.mainCompetition))) {
      continue;
    }

    let sum = 0;
    let count = 0;
    let bestReason = null;

    for (const q of queries) {
      const match = scoreCompetitor(q.norm, q.lang, comp, defaultLanguageId);
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
    aggregates.set(comp.competitorId, { score: sum / count, bestReason });
  }

  const compMap = new Map();
  for (const c of competitors) compMap.set(c.competitorId, c);

  const all = Array.from(aggregates.entries()).map(([competitorId, agg]) => ({
    competitorId,
    name: compMap.get(competitorId)?.displayName || '',
    score: agg.score,
    reason: agg.bestReason,
  }));

  all.sort((a, b) => b.score - a.score);
  return all.slice(0, limit);
}

module.exports = {
  suggestCompetitors,
  invalidateIndex,
};
