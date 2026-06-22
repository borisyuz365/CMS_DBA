// Scans the QA SQL Server for a literal substring across every string column
// in every accessible user database. Read-only.
//
// Usage:
//   node backend/scripts/findValueInQaDb.js '<value-to-find>'
//
// Connects using QA_DB_* env vars (see backend/.env).
require('dotenv').config();
const sql = require('mssql');

const VALUE = process.argv[2];
if (!VALUE) {
  console.error('Usage: node findValueInQaDb.js "<value>"');
  process.exit(2);
}

const cfg = {
  user:     process.env.QA_DB_USER,
  password: process.env.QA_DB_PASSWORD,
  server:   process.env.QA_DB_HOST,
  port:     parseInt(process.env.QA_DB_PORT || '1433', 10),
  database: process.env.QA_DB_NAME || 'master',
  options: { encrypt: false, trustServerCertificate: true },
  pool:    { max: 4, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 10000,
  requestTimeout: 30000,
};

const STRING_TYPES = ['varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext'];

(async () => {
  console.log(`Searching for: ${VALUE}`);
  console.log(`On: ${cfg.server}:${cfg.port} as ${cfg.user}`);
  const pool = await sql.connect(cfg);

  // User databases: skip system ones (database_id <= 4) and offline/restoring.
  const dbs = await pool.request().query(`
    SELECT name FROM sys.databases
    WHERE database_id > 4 AND state_desc = 'ONLINE' AND HAS_DBACCESS(name) = 1
    ORDER BY name
  `);
  console.log(`Accessible user databases: ${dbs.recordset.length}`);

  const hits = [];
  for (const { name: db } of dbs.recordset) {
    let cols;
    try {
      cols = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
        FROM [${db}].INFORMATION_SCHEMA.COLUMNS
        WHERE DATA_TYPE IN ('${STRING_TYPES.join("','")}')
      `);
    } catch (err) {
      console.log(`  [${db}] skipped (cannot list columns: ${err.message})`);
      continue;
    }
    const total = cols.recordset.length;
    let scanned = 0;
    for (const c of cols.recordset) {
      scanned += 1;
      // Cast covers (n)text where LIKE is deprecated.
      const ref = `[${db}].[${c.TABLE_SCHEMA}].[${c.TABLE_NAME}]`;
      const colExpr = `CAST([${c.COLUMN_NAME}] AS NVARCHAR(MAX))`;
      try {
        const r = await pool.request()
          .input('needle', sql.NVarChar, `%${VALUE}%`)
          .query(`SELECT TOP 5 ${colExpr} AS sample FROM ${ref} WHERE ${colExpr} LIKE @needle`);
        if (r.recordset.length > 0) {
          const sample = r.recordset[0].sample;
          const sampleShort = sample.length > 160 ? sample.slice(0, 160) + '…' : sample;
          hits.push({
            db, schema: c.TABLE_SCHEMA, table: c.TABLE_NAME, column: c.COLUMN_NAME,
            rows: r.recordset.length, sample: sampleShort,
          });
          console.log(`  HIT  ${db}.${c.TABLE_SCHEMA}.${c.TABLE_NAME}.${c.COLUMN_NAME}  (${r.recordset.length}+ row(s))`);
        }
      } catch (err) {
        // Permission / table-type errors — quietly skip.
      }
    }
    console.log(`  [${db}] scanned ${scanned}/${total} string columns`);
  }

  await pool.close();

  console.log('\n=== Summary ===');
  if (hits.length === 0) {
    console.log('No matches found.');
  } else {
    for (const h of hits) {
      console.log(`${h.db}.${h.schema}.${h.table}.${h.column}  →  ${h.rows} row(s)`);
      console.log(`    sample: ${h.sample}`);
    }
  }
})().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
