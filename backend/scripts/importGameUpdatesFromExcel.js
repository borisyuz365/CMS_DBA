/**
 * Import game updates from Excel file into game_updates.json
 * Usage: node scripts/importGameUpdatesFromExcel.js [excelPath] [gameId]
 * Default: C:\Users\doronts\Downloads\1124886_2026_02_22.xlsx, GAME_ID 1003
 */
const XLSX = require('xlsx');
const path = require('path');
const dataLoader = require('../utils/dataLoader');

const DEFAULT_EXCEL = 'C:\\Users\\doronts\\Downloads\\1124886_2026_02_22.xlsx';
const DEFAULT_GAME_ID = 1003;

const EXCEL_COLS = [
  'GAME_ID', 'CREATED', 'RECIEVED', 'HANDLED', 'UPDATE_TEXT', 'UPDATE_HASH',
  'SUCCESS', 'CREATED_SEQUENCE', 'EXCEPTION_TEXT', 'WEB_REQUEST', 'WEB_RESPONSE',
  'SENT', 'SCANNER_SENT', 'USED_PROXY', 'DATA_SOURCE_ID', 'TRACE',
  'SHORT_UPDATE_TEXT', 'ID', 'UPDATE_JSON', 'GAME_STARTTIME', 'GAME_STATUS',
  'COMPETITOR_1_CURR_SCORE', 'COMPETITOR_2_CURR_SCORE', 'GAME_TIME', 'TAG', 'RECORD_GUID'
];

async function run() {
  const excelPath = process.argv[2] || DEFAULT_EXCEL;
  const targetGameId = parseInt(process.argv[3] || DEFAULT_GAME_ID, 10);

  console.log('Reading Excel:', excelPath);
  console.log('Target GAME_ID:', targetGameId);

  let workbook;
  try {
    workbook = XLSX.readFile(excelPath);
  } catch (err) {
    console.error('Failed to read Excel:', err.message);
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

  const updates = rawData.map((row, idx) => {
    const rec = {};
    for (const col of EXCEL_COLS) {
      let val = row[col];
      if (val === undefined) val = row[col.replace(/_/g, ' ')]; // fallback for spaces
      if (val === undefined) val = null;

      // Type coercion
      if (col === 'GAME_ID') val = targetGameId; // Override to our local game ID
      else if (col === 'SUCCESS') val = val === true || val === 'true' || val === 1 || val === '1';
      else if (col === 'USED_PROXY') val = val === true || val === 'true' || val === 1 || val === '1';
      else if (['CREATED_SEQUENCE', 'GAME_TIME', 'COMPETITOR_1_CURR_SCORE', 'COMPETITOR_2_CURR_SCORE'].includes(col)) {
        val = val === '' || val === null ? null : parseInt(val, 10);
      } else if (typeof val === 'string' && val.trim() === '') {
        val = null;
      }
      rec[col] = val;
    }
    return rec;
  });

  console.log('Imported', updates.length, 'rows');

  await dataLoader.saveData('game_updates.json', updates);
  console.log('Saved to backend/data/game_updates.json');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
