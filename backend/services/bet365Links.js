// Context-aware affiliate-link resolver for Bet365 (and any other bookmaker
// whose URLs live in T_BET_BOOKMAKER_COUNTRIES + T_DICT_VALUES).
//
// Discovered schema (SportifierDB.dbo):
//   T_BET_BOOKMAKER_COUNTRIES
//     BOOKMAKER_ID     int    -- e.g. 14 for Bet365
//     COUNTRY_ID       int    -- 365scores numeric country id (NOT ISO)
//     PUBLISHER_ID     int    -- -1 = any publisher
//     PLATFORM         int    -- 1=iOS, 2=Android, 3=Mobile Web, 4=Desktop, -1=any (best-effort mapping)
//     AD_CAMPAIGN      varchar-- '' = any
//     LINKS_TEMPLATE   bigint -- term id, the URL template (default path)
//     TRACKING_URL     bigint -- term id, overrides LINKS_TEMPLATE when USE_TRACKING_URL=1
//     LANDING_PAGE     bigint -- term id, fallback URL
//     USE_TRACKING_URL bit    -- prefer TRACKING_URL over LINKS_TEMPLATE
//
//   T_DICT_VALUES
//     TERM_ID  bigint
//     LANG_ID  int
//     VALUE    varchar(...)   -- the actual URL string for this language
//
// The "monthly external update" overwrites T_DICT_VALUES.VALUE rows for the
// existing template term ids — no schema change on Bet365's side propagates
// through.
//
// All names are env-overridable so the same code keeps working if the team
// renames anything.
const { getPool, sql } = require('../db');

const CFG = {
  table:     process.env.MSSQL_BOOKMAKER_LINKS_TABLE         || 'T_BET_BOOKMAKER_COUNTRIES',
  dictTable: process.env.MSSQL_DICT_VALUES_TABLE              || 'T_DICT_VALUES',
  cols: {
    bmid:           process.env.MSSQL_BL_COL_BMID           || 'BOOKMAKER_ID',
    cid:            process.env.MSSQL_BL_COL_CID            || 'COUNTRY_ID',
    publisherId:    process.env.MSSQL_BL_COL_PUBLISHER_ID   || 'PUBLISHER_ID',
    platform:       process.env.MSSQL_BL_COL_PLATFORM       || 'PLATFORM',
    adCampaign:     process.env.MSSQL_BL_COL_AD_CAMPAIGN    || 'AD_CAMPAIGN',
    linksTemplate:  process.env.MSSQL_BL_COL_LINKS_TEMPLATE || 'LINKS_TEMPLATE',
    trackingUrl:    process.env.MSSQL_BL_COL_TRACKING_URL   || 'TRACKING_URL',
    landingPage:    process.env.MSSQL_BL_COL_LANDING_PAGE   || 'LANDING_PAGE',
    useTracking:    process.env.MSSQL_BL_COL_USE_TRACKING   || 'USE_TRACKING_URL',
  },
  dictCols: {
    termId:  process.env.MSSQL_DICT_COL_TERM_ID || 'TERM_ID',
    langId:  process.env.MSSQL_DICT_COL_LANG_ID || 'LANG_ID',
    value:   process.env.MSSQL_DICT_COL_VALUE   || 'VALUE',
  },
};

// Platform string → 365scores int code. Best-effort defaults; override via
// PLATFORM_CODE_<NAME> env if we get the canonical mapping later.
const PLATFORM_CODES = {
  ios:        parseInt(process.env.PLATFORM_CODE_IOS        || '1', 10),
  android:    parseInt(process.env.PLATFORM_CODE_ANDROID    || '2', 10),
  mobileweb:  parseInt(process.env.PLATFORM_CODE_MOBILE_WEB || '3', 10),
  web:        parseInt(process.env.PLATFORM_CODE_WEB        || '4', 10),
  desktop:    parseInt(process.env.PLATFORM_CODE_DESKTOP    || '4', 10),
  any:        -1,
  all:        -1,
};

function normalizePlatform(p) {
  if (p == null || p === '') return -1;
  if (typeof p === 'number' && Number.isFinite(p)) return p;
  const s = String(p).toLowerCase().replace(/[-_\s]/g, '');
  if (Object.prototype.hasOwnProperty.call(PLATFORM_CODES, s)) return PLATFORM_CODES[s];
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : -1;
}

// Best-match strategy:
//   1. Filter rows that "match" the context, treating -1 / 0 / '' as wildcards.
//      (Sportifier uses PLATFORM=0 and sometimes PUBLISHER_ID=0 for "any",
//      not only -1 — confirmed against T_BET_BOOKMAKER_COUNTRIES for Bet365/BR.)
//   2. Score each row by how many context fields are an EXACT match (not wildcard).
//   3. Tie-break by ROW_NUMBER ascending (table order, lowest wins).
//
// Then pick the term id according to USE_TRACKING_URL precedence, and resolve
// that term against T_DICT_VALUES at the requested language (with English/-1
// as a final fallback).
// Returns ALL candidate rows ordered by specificity DESC. Returning multiple
// rows (not TOP 1) lets us fall through to the next-most-specific row when a
// more-specific row's term ids point at empty dictionary entries — a data
// condition seen in production for platform-specific overrides.
function buildBookmakerCountryQuery() {
  const c = CFG.cols;
  return `
    SELECT
      ${c.linksTemplate} AS linksTemplate,
      ${c.trackingUrl}   AS trackingUrl,
      ${c.landingPage}   AS landingPage,
      ${c.useTracking}   AS useTracking
    FROM ${CFG.table}
    WHERE ${c.bmid} = @bmid
      AND ${c.cid}  = @cid
      AND (${c.publisherId} = @publisherId  OR ${c.publisherId} IN (-1, 0))
      AND (${c.platform}    = @platform     OR ${c.platform} IN (-1, 0))
      AND (${c.adCampaign}  = @adCampaign   OR ${c.adCampaign} IN ('', N''))
    ORDER BY
      (CASE WHEN ${c.publisherId} = @publisherId AND ${c.publisherId} NOT IN (-1, 0) THEN 1 ELSE 0 END +
       CASE WHEN ${c.platform}    = @platform    AND ${c.platform}    NOT IN (-1, 0) THEN 1 ELSE 0 END +
       CASE WHEN ${c.adCampaign}  = @adCampaign  AND ${c.adCampaign}  <> ''  THEN 1 ELSE 0 END) DESC
  `;
}

function buildDictValueQuery() {
  const d = CFG.dictCols;
  // English fallback uses LANG_ID = 1 as the 365scores convention.
  return `
    SELECT TOP 1 ${d.value} AS value
    FROM ${CFG.dictTable}
    WHERE ${d.termId} = @termId
      AND ${d.langId} IN (@langId, 1)
    ORDER BY CASE WHEN ${d.langId} = @langId THEN 0 ELSE 1 END
  `;
}

async function resolveBet365Link(context) {
  const bmid = parseInt(context.bmid, 10);
  const cid  = parseInt(context.cid, 10);
  if (!Number.isFinite(bmid) || !Number.isFinite(cid)) return null;

  const langId = Number.isFinite(parseInt(context.languageId, 10))
    ? parseInt(context.languageId, 10)
    : 1;

  const pool = await getPool();
  const rows = (await pool.request()
    .input('bmid',        sql.Int,       bmid)
    .input('cid',         sql.Int,       cid)
    .input('publisherId', sql.Int,       Number.isFinite(parseInt(context.publisherId, 10)) ? parseInt(context.publisherId, 10) : -1)
    .input('platform',    sql.Int,       normalizePlatform(context.platform))
    .input('adCampaign',  sql.NVarChar,  context.campaignSource || '')
    .query(buildBookmakerCountryQuery())).recordset;

  if (!rows.length) return null;

  // Walk rows in specificity order; for each row try TRACKING_URL (if
  // USE_TRACKING_URL) → LINKS_TEMPLATE → LANDING_PAGE; for each term try the
  // requested language then English. First non-null wins.
  //
  // This handles the production reality where platform-specific rows can
  // point at term ids whose dictionary entries are empty — we fall through
  // to the platform=-1 default rather than serve null.
  for (const row of rows) {
    const preferTracking = row.useTracking === true || row.useTracking === 1;
    const candidates = [
      preferTracking ? row.trackingUrl : null,
      row.linksTemplate,
      row.landingPage,
    ].filter(Boolean);
    for (const termId of candidates) {
      const value = (await pool.request()
        .input('termId', sql.BigInt, termId)
        .input('langId', sql.Int,    langId)
        .query(buildDictValueQuery())).recordset[0];
      if (value && value.value) return String(value.value);
    }
  }
  return null;
}

module.exports = { resolveBet365Link, normalizePlatform, PLATFORM_CODES, CFG };
