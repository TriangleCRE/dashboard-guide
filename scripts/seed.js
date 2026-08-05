#!/usr/bin/env node
// Loads db/seed-data.json into the `sections` table - but ONLY if the table
// is completely empty, so this can never overwrite real edits made through
// the app later. Run scripts/migrate.js first if the table doesn't exist yet
// (or just run this - the live API and this script both tolerate a missing
// table by creating it first).
//
// Note: the live API (api/_db.js) does this automatically on first request,
// so running this by hand is optional - it's here for local/manual use.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/seed.js
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

    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM sections');
    if (rows[0].count > 0) {
      console.log(`Table already has ${rows[0].count} row(s) - skipping seed so nothing is overwritten.`);
      return;
    }

    const seedPath = path.join(__dirname, '..', 'db', 'seed-data.json');
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    let inserted = 0;
    for (const section of seed) {
      const result = await client.query(
        `INSERT INTO sections (slug, position, badge_class, badge_text, title_html, body_html)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO NOTHING`,
        [
          section.slug,
          section.position,
          section.badge_class,
          section.badge_text,
          section.title_html,
          section.body_html,
        ]
      );
      inserted += result.rowCount;
    }
    console.log(`Seeded ${inserted} row(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
