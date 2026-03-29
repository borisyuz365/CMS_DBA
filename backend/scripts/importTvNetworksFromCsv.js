const fs = require('fs').promises;
const path = require('path');
const dataLoader = require('../utils/dataLoader');

/**
 * Script to import TV networks from CSV into tv_networks.json
 * CSV columns: TV_NETWORK_ID, NAME_ID, COUNTRY_ID, WEBSITE, CHANNEL_TYPE,
 *              IS_INTERNATIONAL, LANG_ID, CONNECTED_BOOKMAKER, IMG_VER,
 *              PROMOTE_IN_MATCH_REMINDER_NOTIFICATION, ORDER_LEVEL
 *
 * Usage: node scripts/importTvNetworksFromCsv.js [path-to-csv]
 * Default CSV path: New_Query_2026_01_27 (2).csv in current directory
 */

const CSV_HEADERS = [
  'TV_NETWORK_ID',
  'NAME_ID',
  'COUNTRY_ID',
  'WEBSITE',
  'CHANNEL_TYPE',
  'IS_INTERNATIONAL',
  'LANG_ID',
  'CONNECTED_BOOKMAKER',
  'IMG_VER',
  'PROMOTE_IN_MATCH_REMINDER_NOTIFICATION',
  'ORDER_LEVEL'
];

function parseValue(val, key) {
  const s = (val || '').trim();
  if (s === '') return null;

  if (key === 'IS_INTERNATIONAL' || key === 'PROMOTE_IN_MATCH_REMINDER_NOTIFICATION') {
    if (s.toLowerCase() === 'true') return true;
    if (s.toLowerCase() === 'false') return false;
    return null;
  }

  const numericKeys = [
    'TV_NETWORK_ID', 'NAME_ID', 'COUNTRY_ID', 'CHANNEL_TYPE',
    'LANG_ID', 'IMG_VER', 'ORDER_LEVEL'
  ];
  if (numericKeys.includes(key)) {
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }

  return s;
}

function parseCsvRow(headers, values) {
  const row = {};
  headers.forEach((h, i) => {
    row[h] = parseValue(values[i], h);
  });
  return row;
}

async function importTvNetworksFromCsv(csvPath) {
  try {
    const resolvedPath = path.isAbsolute(csvPath)
      ? csvPath
      : path.resolve(process.cwd(), csvPath);

    console.log('Reading CSV from:', resolvedPath);
    const content = await fs.readFile(resolvedPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = parseCsvRow(headers, values);
      if (row.TV_NETWORK_ID != null) {
        records.push(row);
      }
    }

    console.log(`Parsed ${records.length} TV network records`);

    const outputFileName = 'tv_networks.json';
    await dataLoader.saveData(outputFileName, records);

    const dataPath = path.join(__dirname, '../data', outputFileName);
    console.log(`Saved to ${dataPath}`);
    console.log('Done.');
  } catch (error) {
    console.error('Error importing TV networks:', error);
    process.exit(1);
  }
}

const csvPath = process.argv[2] || path.join(process.cwd(), 'New_Query_2026_01_27 (2).csv');

if (require.main === module) {
  importTvNetworksFromCsv(csvPath);
}

module.exports = { importTvNetworksFromCsv, parseCsvRow, parseValue };
