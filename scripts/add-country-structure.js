/**
 * Script to add the full country parameter structure from CSV to all countries in countries.json
 * Based on the structure in New_Query_2026_01_27 (3).csv (England example)
 */

const fs = require('fs');
const path = require('path');

const COUNTRIES_PATH = path.join(__dirname, '../backend/data/countries.json');

// Full structure from CSV - default values from England example
// Fields that don't exist in current JSON get these defaults
const DEFAULT_STRUCTURE = {
  FATHER_COUNTRY_ID: null,
  ALLOW_PREMIUM_INSIGHTS: true,
  TRANSFER_SEASON_ACTIVE: null,
  PHONE_CODE: null,
  ALLOW_BETS_IN_ALL_SCORES: true,
  LOGIN_AVAILABLE: true,
  PLATFORM: null,
  FORCE_RAFFLE_TOP_BOOKMAKER: null,
  ALLOW_SUB_TERRITORY_DETECTION: null,
  ODDS_TYPE: 2,
  TYPE: null,
  CONTINENT_ID: null,
  BLOCK_LIVE_BETTING: false,
  CURRENCY_SYMBOL: null,
  ALLOW_PREMIUM_USERS: null,
  MIN_USERS_FOR_MOST_POPULAR_BET: 100,
  MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS: 50,
  LINEUPS_BET_VALUE: null,
  BET_VALUE: null,
};

// Order of keys as in CSV (for consistent output)
const CSV_FIELD_ORDER = [
  'COUNTRY_ID',
  'NAME_ID',
  'COUNTRY_CODE',
  'TIME_ZONE_ID',
  'FATHER_COUNTRY_ID',
  'IS_NOT_REAL',
  'ALLOW_BETTING',
  'EMOJI',
  'CONNECT_BY_TEXT',
  'ALLOW_PREMIUM_INSIGHTS',
  'TRANSFER_SEASON_ACTIVE',
  'PHONE_CODE',
  'ALLOW_BETS_IN_ALL_SCORES',
  'LOGIN_AVAILABLE',
  'MAIN_COLOR',
  'SECONDARY_COLOR',
  'IMG_VER',
  'PLATFORM',
  'FORCE_RAFFLE_TOP_BOOKMAKER',
  'ALLOW_SUB_TERRITORY_DETECTION',
  'ODDS_TYPE',
  'TYPE',
  'CONTINENT_ID',
  'BLOCK_LIVE_BETTING',
  'CURRENCY_SYMBOL',
  'ALLOW_PREMIUM_USERS',
  'MIN_USERS_FOR_MOST_POPULAR_BET',
  'MIN_USERS_AMOUNT_FOR_POPULAR_OPTIONS',
  'LINEUPS_BET_VALUE',
  'BET_VALUE',
];

function addStructureToCountry(country) {
  const result = { ...country };

  // Add missing fields from default structure
  for (const [key, defaultValue] of Object.entries(DEFAULT_STRUCTURE)) {
    if (result[key] === undefined) {
      result[key] = defaultValue;
    }
  }

  // Build output object in CSV field order, then add 'name' at the end
  const ordered = {};
  for (const key of CSV_FIELD_ORDER) {
    if (result[key] !== undefined) {
      ordered[key] = result[key];
    }
  }
  // Add name (not in CSV but exists in our JSON)
  if (result.name !== undefined) {
    ordered.name = result.name;
  }

  return ordered;
}

function main() {
  const countries = JSON.parse(fs.readFileSync(COUNTRIES_PATH, 'utf8'));

  const updated = countries.map(addStructureToCountry);

  fs.writeFileSync(
    COUNTRIES_PATH,
    JSON.stringify(updated, null, 2),
    'utf8'
  );

  console.log(`Updated ${updated.length} countries with full parameter structure.`);
}

main();
