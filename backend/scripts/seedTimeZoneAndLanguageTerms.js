/**
 * Seed terms for "Time Zone names" and "Language names":
 * 1. Add categories "Time Zone names" (id 55) and "Language names" (id 56)
 * 2. Create one term per time zone (category "Time Zone names"), update time_zones.json NAME_ID
 * 3. Create one term per language (category "Language names"), update languages.json nameId
 *
 * Run from backend: node scripts/seedTimeZoneAndLanguageTerms.js
 */

const path = require('path');
const fs = require('fs').promises;

const DATA_DIR = path.join(__dirname, '../data');

const CATEGORY_TIME_ZONE_NAMES_ID = 55;
const CATEGORY_LANGUAGE_NAMES_ID = 56;
const TERM_ID_TIME_ZONE_START = 52000001;
const TERM_ID_LANGUAGE_START = 52000101;

async function loadJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function saveJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function makeTerm(id, categoryId, categoryName, value) {
  return {
    id,
    categoryId,
    aliasName: null,
    fatherTerm: null,
    createTime: null,
    description: null,
    category: categoryName,
    values: [
      {
        languageId: 1,
        value: value || '',
        isDefault: true,
        status: 'Approved',
      },
    ],
    valsCount: 1,
  };
}

async function main() {
  console.log('Loading data...');
  const [categories, terms, timeZones, languages] = await Promise.all([
    loadJson('categories.json'),
    loadJson('terms.json'),
    loadJson('time_zones.json'),
    loadJson('languages.json'),
  ]);

  const categoriesArray = Array.isArray(categories) ? categories : [];
  const termsArray = Array.isArray(terms) ? terms : [];

  // 1. Add categories if missing
  if (!categoriesArray.find((c) => c.id === CATEGORY_TIME_ZONE_NAMES_ID)) {
    categoriesArray.push({
      id: CATEGORY_TIME_ZONE_NAMES_ID,
      aliasName: 'Time Zone names',
      nameId: null,
      description: 'Category for time zone display names',
      fatherCategoryId: 46,
      name: 'Time Zone names',
      fatherCategory: 'All Categories',
    });
    console.log('Added category "Time Zone names" (id 55)');
  }
  if (!categoriesArray.find((c) => c.id === CATEGORY_LANGUAGE_NAMES_ID)) {
    categoriesArray.push({
      id: CATEGORY_LANGUAGE_NAMES_ID,
      aliasName: 'Language names',
      nameId: null,
      description: 'Category for language display names',
      fatherCategoryId: 46,
      name: 'Language names',
      fatherCategory: 'All Categories',
    });
    console.log('Added category "Language names" (id 56)');
  }
  await saveJson('categories.json', categoriesArray);

  // 2. Time Zone terms: create one term per time zone, assign new ids
  const timeZoneTerms = [];
  const timeZonesUpdated = timeZones.map((tz, index) => {
    const termId = TERM_ID_TIME_ZONE_START + index;
    timeZoneTerms.push(
      makeTerm(termId, CATEGORY_TIME_ZONE_NAMES_ID, 'Time Zone names', tz.TIME_ZONE_NAME)
    );
    return { ...tz, NAME_ID: termId };
  });

  // Remove any existing terms in our id range (re-run safety)
  const termsFiltered = termsArray.filter(
    (t) => t.id < TERM_ID_TIME_ZONE_START || t.id >= TERM_ID_LANGUAGE_START + 100
  );
  const newTerms = [...termsFiltered, ...timeZoneTerms];
  console.log(`Created ${timeZoneTerms.length} terms for Time Zone names`);

  // 3. Language terms: create one term per language
  const languageTerms = [];
  const languagesUpdated = languages.map((lang, index) => {
    const termId = TERM_ID_LANGUAGE_START + index;
    languageTerms.push(
      makeTerm(termId, CATEGORY_LANGUAGE_NAMES_ID, 'Language names', lang.name)
    );
    return { ...lang, nameId: termId };
  });
  newTerms.push(...languageTerms);
  console.log(`Created ${languageTerms.length} terms for Language names`);

  await saveJson('terms.json', newTerms);
  await saveJson('time_zones.json', timeZonesUpdated);
  await saveJson('languages.json', languagesUpdated);

  console.log('Done. time_zones.json NAME_ID and languages.json nameId updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
