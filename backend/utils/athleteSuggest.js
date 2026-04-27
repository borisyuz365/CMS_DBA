/**
 * Athlete suggestion engine for the Terms-Fix page.
 *
 * Given one or more "temp" rows (each with NAME + LANG_ID), compute the
 * top-N existing athletes from athletes.json whose name (or any of
 * the multi-language values on its term) is most similar to the temp name(s).
 *
 * Supports optional `competitorIds` filter (matching CURRENT_CLUB_ID) and
 * `sportTypeIds` filter to restrict results.
 *
 * Reuses the same string-similarity primitives from countrySuggest.
 */

const fs = require('fs');
const path = require('path');
const dataLoader = require('./dataLoader');
const { _internals: { normalize, similarity } } = require('./countrySuggest');

const DEFAULT_LANG_ID = 1;
const ATHLETES_FILE = 'athletes.json';
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
  const [athletes, terms] = await Promise.all([
    dataLoader.loadData(ATHLETES_FILE),
    dataLoader.loadData(TERMS_FILE),
  ]);

  const termsById = new Map();
  for (const t of terms || []) {
    if (t && t.id != null) termsById.set(Number(t.id), t);
  }

  const indexed = [];
  for (const a of athletes || []) {
    if (!a || a.IS_DELETED) continue;
    const athleteId = Number(a.ATHLETE_ID);
    if (!Number.isFinite(athleteId)) continue;

    const sportTypeId = a.SPORT_TYPE_ID != null ? Number(a.SPORT_TYPE_ID) : null;
    const nationality = a.NATIONALITY != null ? Number(a.NATIONALITY) : null;
    const currentClubId = a.CURRENT_CLUB_ID != null ? Number(a.CURRENT_CLUB_ID) : null;

    const term = a.NAME_ID != null ? termsById.get(Number(a.NAME_ID)) : null;
    const values = [];
    let displayName = `Athlete ${athleteId}`;

    if (term && Array.isArray(term.values)) {
      for (const v of term.values) {
        const norm = normalize(v.value);
        if (!norm) continue;
        values.push({
          norm,
          languageId: v.languageId != null ? Number(v.languageId) : null,
          isDefault: Boolean(v.isDefault),
        });
        if (v.isDefault || (displayName.startsWith('Athlete ') && Number(v.languageId) === DEFAULT_LANG_ID)) {
          displayName = String(v.value || '').trim();
        }
      }
    }

    indexed.push({
      athleteId,
      sportTypeId,
      nationality,
      currentClubId,
      nameId: a.NAME_ID != null ? Number(a.NAME_ID) : null,
      displayName,
      values,
    });
  }

  return indexed;
}

async function getIndex() {
  const [ma, mt] = await Promise.all([mtime(ATHLETES_FILE), mtime(TERMS_FILE)]);
  if (cached && cached.mtimeAthletes === ma && cached.mtimeTerms === mt) {
    return cached.athletes;
  }
  const athletes = await buildIndex();
  cached = { mtimeAthletes: ma, mtimeTerms: mt, athletes };
  return athletes;
}

function invalidateIndex() {
  cached = null;
}

const SAME_LANG_BOOST = 1.05;
const DEFAULT_LANG_WEIGHT = 1.0;
const OTHER_LANG_WEIGHT = 0.9;

function scoreAthlete(normQuery, queryLang, athlete, defaultLanguageId) {
  let best = { score: 0, matchedText: '', matchedLang: null, kind: 'none' };

  const consider = (text, lang, kind, weight) => {
    if (!text) return;
    const s = similarity(normQuery, text) * weight;
    if (s > best.score) {
      best = { score: s, matchedText: text, matchedLang: lang, kind };
    }
  };

  for (const v of athlete.values) {
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
 * Suggest the top-N matching athletes for one or more temp rows.
 *
 * @param {Array<{ NAME?: string, LANG_ID?: number }>} tempRows
 * @param {object} [options]
 * @param {number} [options.limit=3]
 * @param {number} [options.defaultLanguageId=1]
 * @param {number} [options.minLength=4]
 * @param {number[]} [options.competitorIds=[]] When non-empty, only athletes
 *   whose CURRENT_CLUB_ID is in this list are considered.
 * @param {number[]} [options.sportTypeIds=[]] When non-empty, only athletes
 *   whose SPORT_TYPE_ID is in this list are considered.
 */
async function suggestAthletes(tempRows, options = {}) {
  const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
  const defaultLanguageId = Number(options.defaultLanguageId) || DEFAULT_LANG_ID;
  const minLength = Number(options.minLength) >= 0 ? Number(options.minLength) : 4;
  const competitorIds = Array.isArray(options.competitorIds) ? new Set(options.competitorIds) : new Set();
  const sportTypeIds = Array.isArray(options.sportTypeIds) ? new Set(options.sportTypeIds) : new Set();

  const queries = (Array.isArray(tempRows) ? tempRows : [])
    .map((r, i) => ({
      index: i,
      norm: normalize(r?.NAME),
      lang: r?.LANG_ID != null && Number.isFinite(Number(r.LANG_ID)) ? Number(r.LANG_ID) : null,
    }))
    .filter((q) => q.norm.length >= minLength);

  if (queries.length === 0) return [];

  const athletes = await getIndex();

  const aggregates = new Map();

  for (const ath of athletes) {
    if (competitorIds.size > 0 && (ath.currentClubId == null || !competitorIds.has(ath.currentClubId))) {
      continue;
    }
    if (sportTypeIds.size > 0 && (ath.sportTypeId == null || !sportTypeIds.has(ath.sportTypeId))) {
      continue;
    }

    let sum = 0;
    let count = 0;
    let bestReason = null;

    for (const q of queries) {
      const match = scoreAthlete(q.norm, q.lang, ath, defaultLanguageId);
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
    aggregates.set(ath.athleteId, { score: sum / count, bestReason });
  }

  const athMap = new Map();
  for (const a of athletes) athMap.set(a.athleteId, a);

  const all = Array.from(aggregates.entries()).map(([athleteId, agg]) => ({
    athleteId,
    name: athMap.get(athleteId)?.displayName || '',
    score: agg.score,
    reason: agg.bestReason,
  }));

  all.sort((a, b) => b.score - a.score);
  return all.slice(0, limit);
}

module.exports = {
  suggestAthletes,
  invalidateIndex,
};
