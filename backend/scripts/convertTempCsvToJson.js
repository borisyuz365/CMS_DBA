/**
 * Converts backend/data/temp/*.csv to JSON arrays in the same folder:
 * athletes.csv -> athletes_temp.json, etc.
 * RFC 4180-style parsing (quoted fields, escaped "", newlines inside quotes).
 */
const fs = require('fs').promises;
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../data/temp');

const FILES = [
  'athletes',
  'competitors',
  'phases',
  'seasons',
  'countries',
  'competitions'
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (c === '\r') continue;
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += c;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function coerceCell(raw) {
  const s = raw == null ? '' : String(raw);
  const t = s.trim();
  if (t === '') return null;
  const lower = t.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(t)) {
    const n = Number(t);
    if (!Number.isFinite(n)) return t;
    if (Number.isInteger(n)) return n;
    const asInt = Math.trunc(n);
    if (asInt === n) return asInt;
    return n;
  }
  return t;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const obj = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c];
      if (!key) continue;
      obj[key] = coerceCell(cells[c]);
    }
    out.push(obj);
  }
  return out;
}

async function main() {
  for (const base of FILES) {
    const csvPath = path.join(TEMP_DIR, `${base}.csv`);
    const jsonPath = path.join(TEMP_DIR, `${base}_temp.json`);
    const raw = await fs.readFile(csvPath, 'utf8');
    const rows = parseCsv(raw);
    const data = rowsToObjects(rows);
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Wrote ${data.length} rows -> ${path.basename(jsonPath)}`);
  }

  for (const base of FILES) {
    await fs.unlink(path.join(TEMP_DIR, `${base}.csv`));
    console.log(`Removed ${base}.csv`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
