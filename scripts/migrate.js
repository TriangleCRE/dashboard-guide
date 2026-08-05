#!/usr/bin/env node
// Creates the `sections` table (schema only - no data). Idempotent, safe to
// re-run any time.
//
// Note: the live API (api/_db.js) does this automatically on first request,
// so running this by hand is optional - it's here for local/manual use
// (e.g. inspecting the schema locally, or CI).
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    console.error(
      'Missing a Postgres connection string. Set DATABASE_URL (or POSTGRES_URL) before running this script.'
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Schema ensured (sections table + index).');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
