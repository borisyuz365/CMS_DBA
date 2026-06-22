// Shared helper: append an entry to the dba_audit_log table.
const { pool } = require('../db/mysql');

async function appendAuditEntry({ kind, who, text }) {
  const occurred = new Date();
  await pool.query(
    `INSERT INTO dba_audit_log (kind, who, occurred_at, text) VALUES (?, ?, ?, ?)`,
    [kind, who || 'D. Benvelgy', occurred, text],
  );
  return { kind, who: who || 'D. Benvelgy', when: occurred.toISOString(), text };
}

module.exports = { appendAuditEntry };
