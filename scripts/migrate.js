#!/usr/bin/env node
// Creates the `sections` table (if needed) and seeds it with the content
// that used to be hard-coded in index.html (see db/seed-data.json).
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.js
//
// Safe to re-run: the table creation is idempotent, and seeding uses
// ON CONFLICT (slug) DO NOTHING so it never overwrites edits made later
// through the site's Edit mode / the API.
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
    console.log('Schema ensured (sections table).');

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

    console.log(`Seed complete: ${inserted} new row(s) inserted, ${seed.length - inserted} already present.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
