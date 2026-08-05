// Shared Postgres connection helper for the /api/* serverless functions.
//
// Vercel's Neon Postgres integration adds several connection-string env
// vars automatically (DATABASE_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING,
// POSTGRES_PRISMA_URL, ...). We never hard-code credentials here - we just
// pick whichever of those the environment provides.
const { Pool } = require('pg');
const seedData = require('../db/seed-data.json');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let pool;

function getPool() {
  if (!connectionString) {
    throw new Error(
      'No Postgres connection string found. Set DATABASE_URL / POSTGRES_URL in the project environment variables.'
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      // Neon requires TLS; local/dev databases typically don't present a
      // trusted cert chain, so relax verification rather than failing closed.
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

// Mirrors db/schema.sql - kept inline (rather than read from disk) so it's
// guaranteed to be part of the serverless function bundle.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sections (
  slug        TEXT PRIMARY KEY,
  position    INTEGER NOT NULL,
  badge_class TEXT NOT NULL DEFAULT 'step-badge',
  badge_text  TEXT NOT NULL DEFAULT '',
  title_html  TEXT NOT NULL DEFAULT '',
  body_html   TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sections_position_idx ON sections (position);
`;

let readyPromise = null;

// Self-healing setup: runs before every request is served (cached per warm
// lambda instance, so it only actually hits the database once per instance).
//
//   1. Create the table/index if they don't exist yet.
//   2. If - and only if - the table is completely empty, load the seed data.
//
// The empty check means this can never clobber real edits made through the
// app later: once a single row exists, seeding is skipped forever. Seeding
// itself uses ON CONFLICT DO NOTHING per row, so it's also safe if two cold
// starts happen to race each other on a brand-new database.
function ensureReady(pool) {
  if (!readyPromise) {
    readyPromise = (async () => {
      await pool.query(SCHEMA_SQL);

      const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM sections');
      if (rows[0].count > 0) return;

      for (const section of seedData) {
        await pool.query(
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
      }
    })().catch((err) => {
      // Don't cache a failure forever - let the next request retry.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

module.exports = { getPool, ensureReady };
