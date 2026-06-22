// MySQL connection pool for DBA management tables.
// Separate from the MSSQL pool in backend/db.js (which talks to SportifierDB).
//
// Defaults match docker-compose.yml; override via env (MYSQL_HOST etc.) when
// pointing at RDS or a remote instance.
const mysql = require('mysql2/promise');

const cfg = {
  host:     process.env.MYSQL_HOST     || '127.0.0.1',
  port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
  user:     process.env.MYSQL_USER     || 'cms',
  password: process.env.MYSQL_PASSWORD || 'cmspass',
  database: process.env.MYSQL_DATABASE || 'dba_cms',
  connectionLimit: 10,
  waitForConnections: true,
  // Return Dates as JS Date objects so we can convert to ISO strings in routes.
  dateStrings: false,
  // JSON columns come back already-parsed.
};

const pool = mysql.createPool(cfg);

pool.on('error', (err) => {
  console.error('[mysql] pool error:', err.message);
});

module.exports = { pool };
