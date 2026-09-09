import mysql from 'mysql2/promise';
import { env } from './env.js';

/**
 * The database is remote, and idle sockets get dropped by the server (and by any
 * NAT/firewall in between). Without keep-alive the pool happily hands out a dead
 * connection and the first query on it fails with ECONNRESET after a long stall.
 * keepAlive holds the socket open; idleTimeout/maxIdle retire connections on our
 * side before the server does; and `isRetryableConnectionError` covers the rest.
 */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 30_000,
  queueLimit: 0,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  charset: 'utf8mb4_unicode_ci',
});

/** Connection-level failures worth transparently retrying once on a fresh socket. */
const RETRYABLE = new Set([
  'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST',
  'EPIPE',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ER_CON_COUNT_ERROR',
]);

const isRetryableConnectionError = (error) =>
  RETRYABLE.has(error?.code) || error?.fatal === true;

/** Run `work`, retrying once if the pooled connection turned out to be dead. */
const withRetry = async (work, label) => {
  try {
    return await work();
  } catch (error) {
    if (!isRetryableConnectionError(error)) throw error;
    console.warn(`⚠ ${label} failed with ${error.code || 'fatal'} — retrying on a fresh connection`);
    return work();
  }
};

/** Run a query and return rows. */
export const query = async (sql, params = []) =>
  withRetry(async () => {
    const [rows] = await pool.query(sql, params);
    return rows;
  }, 'query');

/** Run a query expecting a single row. */
export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

/**
 * Run work inside a transaction. Only the initial connection checkout is retried —
 * once statements have run we must not replay them, so mid-transaction failures
 * roll back and surface to the caller.
 */
export const transaction = async (work) => {
  const conn = await withRetry(() => pool.getConnection(), 'getConnection');
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      /* connection already gone — nothing to roll back */
    }
    throw error;
  } finally {
    conn.release();
  }
};

export const assertDbConnection = async () => {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
};

/** True when the database actually answers, used by the health endpoint. */
export const isDbHealthy = async () => {
  try {
    await withRetry(async () => {
      const conn = await pool.getConnection();
      try {
        await conn.ping();
      } finally {
        conn.release();
      }
    }, 'ping');
    return true;
  } catch {
    return false;
  }
};

pool.on('connection', () => {
  if (!env.isProd) console.log('• MySQL connection opened');
});
