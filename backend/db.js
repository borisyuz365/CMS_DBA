// MSSQL connection pool for the SportifierDB.
// Lazy: the first request that needs a connection initialises the pool;
// errors are caught and surfaced per-route so the server still starts when the
// DB is unreachable (e.g. dev without VPN).
const sql = require('mssql');

const cfg = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server:   process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 8000,
  requestTimeout: 15000,
};

let poolPromise = null;

async function getPool() {
  if (poolPromise) return poolPromise;
  poolPromise = sql.connect(cfg).then((pool) => {
    console.log(`[mssql] connected to ${cfg.database} on ${cfg.server}:${cfg.port}`);
    pool.on('error', (err) => {
      console.error('[mssql] pool error:', err.message);
      poolPromise = null;
    });
    return pool;
  }).catch((err) => {
    poolPromise = null;
    throw err;
  });
  return poolPromise;
}

module.exports = { getPool, sql };
