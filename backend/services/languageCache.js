// In-memory cache of UI languages, sourced from production T_LANGUAGES
// (MSSQL SportifierDB). Used by BP Editor and DBA template translations.
//
// backend/data/languages.json is NOT reliable — its IDs diverge from production
// (e.g. local Italian=8 vs T_LANGUAGES Italian=12). Always source from here.
//
// UI languages = LANG_TYPE = 1 (same filter as Betting Request Simulator).
// WEB/BUZZ synthetic rows are excluded.

const { getPool } = require('../db');

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

// Country code → preferred ISO-2 / culture hint for resolving LANGUAGE_ID.
// Used when building DBA country→lang lookups from the live cache.
const COUNTRY_LANG_HINT = {
  GLOBAL: { iso2: 'en' },
  US: { iso2: 'en' },
  UK: { iso2: 'en' },
  AU: { iso2: 'en' },
  CA: { iso2: 'en' },
  DE: { iso2: 'de' },
  IT: { iso2: 'it' },
  BR: { iso2: 'pt', culturePrefix: 'pt-BR' },
  ES: { iso2: 'es', preferLatam: true },
  AR: { iso2: 'es', preferLatam: true },
  MX: { iso2: 'es', preferLatam: true },
  CL: { iso2: 'es', preferLatam: true },
  CO: { iso2: 'es', preferLatam: true },
  EC: { iso2: 'es', preferLatam: true },
  PE: { iso2: 'es', preferLatam: true },
  PL: { iso2: 'pl' },
};

// Static fallbacks when MSSQL is unreachable (production T_LANGUAGES IDs).
const COUNTRY_LANG_FALLBACK = {
  GLOBAL: 1, US: 1, UK: 1, AU: 1, CA: 1,
  DE: 7,
  ES: 29, AR: 29, MX: 29, CL: 29, CO: 29, EC: 29, PE: 29,
  IT: 12,
  BR: 31,
  PL: 35,
};

let languages = []; // [{ id, name, iso2, cultureName }]
let lastSuccessAt = null;
let consecutiveFailures = 0;

async function refresh() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        l.LANGUAGE_ID        AS id,
        dv.VALUE             AS name,
        l.ISO_2_LETTERS_CODE AS iso2,
        l.CULTURE_NAME       AS cultureName
      FROM T_LANGUAGES l
      LEFT JOIN T_DICT_VALUES dv ON dv.TERM_ID = l.NAME_ID AND dv.LANG_ID = 1
      WHERE l.LANG_TYPE = 1
        AND dv.VALUE IS NOT NULL
        AND dv.VALUE NOT IN ('WEB', 'BUZZ')
    `);
    const seen = new Set();
    const list = [];
    for (const row of result.recordset) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      list.push({
        id: row.id,
        name: String(row.name).trim(),
        iso2: row.iso2 ? String(row.iso2).trim().toLowerCase() : null,
        cultureName: row.cultureName ? String(row.cultureName).trim() : null,
      });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    languages = list;
    lastSuccessAt = Date.now();
    consecutiveFailures = 0;
    console.log(`[languageCache] loaded ${list.length} UI languages from T_LANGUAGES`);
  } catch (err) {
    consecutiveFailures += 1;
    if (!lastSuccessAt) {
      console.error(`[languageCache] ERROR: never loaded — BP/DBA language pickers unavailable. MSSQL/T_LANGUAGES unreachable (attempt ${consecutiveFailures}): ${err.message}`);
    } else {
      const staleMinutes = Math.round((Date.now() - lastSuccessAt) / 60000);
      console.error(`[languageCache] ERROR: refresh failed, serving ${staleMinutes}min-stale data (${consecutiveFailures} consecutive failures): ${err.message}`);
    }
  }
}

function start() {
  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
}

function listLanguages() {
  return languages;
}

/** Resolve a country code to a production LANGUAGE_ID using the live cache. */
function langIdForCountry(countryCode) {
  if (!countryCode) return null;
  const code = String(countryCode).toUpperCase();
  const hint = COUNTRY_LANG_HINT[code];
  if (!hint || !languages.length) return COUNTRY_LANG_FALLBACK[code] || null;

  const candidates = languages.filter((l) => l.iso2 === hint.iso2);
  if (!candidates.length) return COUNTRY_LANG_FALLBACK[code] || null;

  if (hint.culturePrefix) {
    const byCulture = candidates.find((l) =>
      (l.cultureName || '').toLowerCase().startsWith(hint.culturePrefix.toLowerCase()));
    if (byCulture) return byCulture.id;
  }
  if (hint.preferLatam) {
    const latam = candidates.find((l) =>
      /latam|mexico|mx|argentina/i.test(`${l.name} ${l.cultureName || ''}`)
      || (l.cultureName || '').toLowerCase().startsWith('es-')
        && !(l.cultureName || '').toLowerCase().startsWith('es-es'));
    if (latam) return latam.id;
    // Known production Spanish LATAM id when multiple `es` rows exist.
    const known = candidates.find((l) => l.id === 29);
    if (known) return known.id;
  }
  // Prefer exact culture match for EN (en-US) when present.
  if (hint.iso2 === 'en') {
    const en = candidates.find((l) => l.id === 1) || candidates[0];
    return en.id;
  }
  return candidates[0].id;
}

module.exports = {
  start,
  listLanguages,
  langIdForCountry,
  COUNTRY_LANG_FALLBACK,
};
