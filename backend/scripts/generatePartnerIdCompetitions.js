const fs = require('fs').promises;
const path = require('path');

/**
 * Generates partner_id_competitions.json:
 * - One row per competition (except 52) with COMPETITION_ID and null for DATA_SOURCE_ID, PARTNER_ID, CREATE_TIME, UPDATE_TIME, UPDATE_BY
 * - For competition 52: all rows from the CSV (CSV example was for competition 7 → maps to our 52)
 *
 * CSV columns: COMPETITION_ID, DATA_SOURCE_ID, PARTNER_ID, CREATE_TIME, UPDATE_TIME, UPDATE_BY
 *
 * Usage: node scripts/generatePartnerIdCompetitions.js [path-to-csv]
 * Default CSV: ..\..\..\Downloads\New_Query_2026_01_27 (1).csv (relative to backend)
 */

const OUR_COMPETITION_ID_FOR_CSV = 52; // CSV example has competition 7 = our 52
const DATA_DIR = path.join(__dirname, '..', 'data');
const COMPETITIONS_FILE = path.join(DATA_DIR, 'competitions.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'partner_id_competitions.json');

function parseValue(val, key) {
  const s = (val || '').trim();
  if (s === '') return null;

  if (key === 'COMPETITION_ID' || key === 'DATA_SOURCE_ID') {
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }
  return s;
}

async function getCompetitionIds() {
  const data = await fs.readFile(COMPETITIONS_FILE, 'utf8');
  const arr = JSON.parse(data);
  return arr.map((o) => o.COMPETITION_ID).filter((id) => id != null);
}

async function parseCsv(csvPath) {
  const raw = await fs.readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const val = parts[j];
      row[key] = parseValue(val, key);
    }
    rows.push(row);
  }
  return { headers, rows };
}

async function main() {
  const csvPath = process.argv[2] || path.join(__dirname, '..', '..', '..', 'Downloads', 'New_Query_2026_01_27 (1).csv');

  const competitionIds = await getCompetitionIds();
  let csvRows = [];
  try {
    const parsed = await parseCsv(csvPath);
    csvRows = parsed.rows;
  } catch (e) {
    console.warn('CSV not found or unreadable, using only null rows for all competitions:', e.message);
  }

  const result = [];

  for (const compId of competitionIds) {
    if (compId === OUR_COMPETITION_ID_FOR_CSV && csvRows.length > 0) {
      for (const row of csvRows) {
        result.push({
          COMPETITION_ID: OUR_COMPETITION_ID_FOR_CSV,
          DATA_SOURCE_ID: row.DATA_SOURCE_ID ?? null,
          PARTNER_ID: row.PARTNER_ID ?? null,
          CREATE_TIME: row.CREATE_TIME ?? null,
          UPDATE_TIME: row.UPDATE_TIME ?? null,
          UPDATE_BY: row.UPDATE_BY ?? null
        });
      }
    } else {
      result.push({
        COMPETITION_ID: compId,
        DATA_SOURCE_ID: null,
        PARTNER_ID: null,
        CREATE_TIME: null,
        UPDATE_TIME: null,
        UPDATE_BY: null
      });
    }
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Written ${result.length} rows to ${OUTPUT_FILE}`);
  console.log(`Competitions: ${competitionIds.length}, competition ${OUR_COMPETITION_ID_FOR_CSV} has ${csvRows.length} partner rows from CSV.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
