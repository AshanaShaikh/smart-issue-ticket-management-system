// run_migration.js — applies 001_ai_cache_and_jobs.sql
// Run once: node migrations/run_migration.js
const fs   = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '001_ai_cache_and_jobs.sql'),
    'utf8'
  );
  console.log('Applying migration 001_ai_cache_and_jobs.sql …');
  await pool.query(sql);
  console.log('Migration applied successfully.');
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  pool.end();
  process.exit(1);
});
