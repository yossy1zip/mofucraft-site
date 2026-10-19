import mysql from 'mysql2/promise';

// Database configuration from environment variables
const DB_HOST = process.env.DB_HOST
const DB_USER = process.env.DB_USER || 'mofucraft_read';
const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable must be set');
}
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || 'mofucraft';
const DB_NAME_MAIN = process.env.DB_NAME_MAIN || 'mofucraft_main';
const DB_NAME_DPS = process.env.DB_NAME_DPS || 'mofudps';
const DB_NAME_PVE = process.env.DB_NAME_PVE || 'mofucraft_pve';
const DB_CONNECTION_LIMIT = parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);

// Original mofucraft database connection
export const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// New mofucraft_main database connection
export const poolMain = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME_MAIN,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// MofuDPS plugin database connection (max DPS rankings)
export const poolDps = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME_DPS,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// MofuPvE plugin database connection (weapon used / kill count rankings)
export const poolPve = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME_PVE,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});