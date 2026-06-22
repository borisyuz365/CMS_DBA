// One-shot migration: backend/data/dba_*.json → MySQL.
// Run with:
//   node backend/scripts/migrateJsonToMysql.js
//
// Idempotent: truncates the dba_* tables first, then re-inserts from JSON.
// Safe to re-run after editing the JSON files (during dev). The JSON files
// themselves are NOT deleted by this script — do that explicitly after
// confirming the migration worked.

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../db/mysql');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function loadJson(file) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Convert an ISO 8601 string to a MySQL TIMESTAMP-friendly value.
// mysql2 accepts JS Date objects directly; null passes through.
function isoToDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function migrateBookmakers(conn) {
  const data = await loadJson('dba_bookmakers.json');
  if (!data) { console.log('  (no dba_bookmakers.json — skipping)'); return; }
  await conn.query('DELETE FROM dba_bookmaker_variants');
  await conn.query('DELETE FROM dba_bookmakers');
  for (const bm of data) {
    await conn.query(
      `INSERT INTO dba_bookmakers
         (id, name, brand_color, secondary_color, logo_bg, logo_fg, initials,
          default_logo_image_url, default_logo_image_url_no_bg, use_no_bg_logo, dedicated_logo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bm.id, bm.name, bm.brandColor || null, bm.secondaryColor || null,
        bm.logoBg || null, bm.logoFg || null, bm.initials || null,
        bm.defaultLogoImageUrl || null, bm.defaultLogoImageUrlNoBg || null,
        bm.useNoBgLogo ? 1 : 0,
        bm.dedicatedLogo ? JSON.stringify(bm.dedicatedLogo) : null,
      ],
    );
    for (const [cc, v] of Object.entries(bm.variants || {})) {
      await conn.query(
        `INSERT INTO dba_bookmaker_variants
           (bookmaker_id, country_code, affiliate, status, modified, modified_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bm.id, cc, v.affiliate, v.status, isoToDate(v.modified), v.modifiedBy],
      );
    }
  }
  console.log(`  migrated ${data.length} bookmakers + variants`);
}

async function migrateTemplates(conn) {
  const data = await loadJson('dba_templates.json');
  if (!data) { console.log('  (no dba_templates.json — skipping)'); return; }
  await conn.query('DELETE FROM dba_templates');
  for (const t of data) {
    await conn.query(
      `INSERT INTO dba_templates
         (id, name, size_id, size_label, status, bookmaker_id, config, modified, modified_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id, t.name, t.sizeId, t.size || null, t.status,
        t.bookmakerId || null,
        JSON.stringify(t.config || {}),
        isoToDate(t.modified), t.modifiedBy,
      ],
    );
  }
  console.log(`  migrated ${data.length} templates`);
}

async function migrateAuditLog(conn) {
  const data = await loadJson('dba_audit_log.json');
  if (!data) { console.log('  (no dba_audit_log.json — skipping)'); return; }
  await conn.query('DELETE FROM dba_audit_log');
  // Insert oldest-first so AUTO_INCREMENT ids reflect chronological order.
  const ordered = [...data].sort((a, b) => new Date(a.when) - new Date(b.when));
  for (const e of ordered) {
    await conn.query(
      `INSERT INTO dba_audit_log (kind, who, occurred_at, text) VALUES (?, ?, ?, ?)`,
      [e.kind, e.who, isoToDate(e.when), e.text],
    );
  }
  console.log(`  migrated ${ordered.length} audit entries`);
}

async function migrateServiceState(conn) {
  const data = await loadJson('dba_service_state.json');
  if (!data) { console.log('  (no dba_service_state.json — skipping)'); return; }
  await conn.query(
    `INSERT INTO dba_service_state (id, last_restart_at, last_restart_by)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE last_restart_at = VALUES(last_restart_at),
                             last_restart_by = VALUES(last_restart_by)`,
    [isoToDate(data.lastRestartAt), data.lastRestartBy || null],
  );
  console.log(`  service state: lastRestartAt=${data.lastRestartAt}`);
}

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Migrating JSON → MySQL…');
    await conn.beginTransaction();
    await migrateBookmakers(conn);
    await migrateTemplates(conn);
    await migrateAuditLog(conn);
    await migrateServiceState(conn);
    await conn.commit();
    console.log('Done.');
  } catch (err) {
    await conn.rollback();
    console.error('Migration failed, rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
})();
