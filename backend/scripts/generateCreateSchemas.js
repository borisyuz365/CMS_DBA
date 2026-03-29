/**
 * Generates create-schema JSON files from backend/data.
 * For each entity, takes the record with the lowest ID and saves it as the schema
 * with a "type" per field (int, float, string, bool, any) and "default" value.
 *
 * Run from backend folder: node scripts/generateCreateSchemas.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCHEMAS_DIR = path.join(DATA_DIR, 'schemas');

const ENTITIES = [
  { file: 'countries.json', idField: 'COUNTRY_ID', schemaName: 'countries.schema.json' },
  { file: 'tv_networks.json', idField: 'TV_NETWORK_ID', schemaName: 'tv_networks.schema.json' },
  { file: 'sports.json', idField: 'SPORT_TYPE_ID', schemaName: 'sports.schema.json' },
  { file: 'athletes.json', idField: 'ATHLETE_ID', schemaName: 'athletes.schema.json' },
  { file: 'competitors.json', idField: 'COMPETITOR_ID', schemaName: 'competitors.schema.json' },
  { file: 'venues.json', idField: 'VENUE_ID', schemaName: 'venues.schema.json' },
  { file: 'competitions.json', idField: 'COMPETITION_ID', schemaName: 'competitions.schema.json' },
  { file: 'languages.json', idField: 'id', schemaName: 'languages.schema.json' },
  { file: 'time_zones.json', idField: 'TIME_ZONE_ID', schemaName: 'time_zones.schema.json' },
];

function inferType(value, key) {
  if (value === null) {
    if (key.endsWith('_ID') || key.endsWith('ID')) return 'int';
    if (key.includes('COLOR') || key.includes('VER') || key.includes('TYPE')) return 'int';
    if (key.includes('_AT') || key.includes('DATE')) return 'string';
    return 'any';
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'object') return 'any';
  return 'any';
}

function recordToSchema(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = {
      type: inferType(value, key),
      default: value,
    };
  }
  return out;
}

if (!fs.existsSync(SCHEMAS_DIR)) {
  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
}

for (const { file, idField, schemaName } of ENTITIES) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip ${file}: not found`);
    continue;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    console.warn(`Skip ${file}: invalid JSON`);
    continue;
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    console.warn(`Skip ${file}: empty or not array`);
    continue;
  }
  const withId = arr.filter((r) => r[idField] != null);
  if (withId.length === 0) {
    console.warn(`Skip ${file}: no record with ${idField}`);
    continue;
  }
  const minRecord = withId.reduce((a, b) => (a[idField] <= b[idField] ? a : b));
  const schema = recordToSchema(minRecord);
  if (!('IS_DELETED' in schema)) {
    schema.IS_DELETED = { type: 'bool', default: false };
  }
  const schemaPath = path.join(SCHEMAS_DIR, schemaName);
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf8');
  console.log(`Wrote ${schemaName} (${idField}=${minRecord[idField]}, ${Object.keys(schema).length} fields)`);
}

console.log('Done.');
