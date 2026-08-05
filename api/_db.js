// Shared Postgres connection helper for the /api/* serverless functions.
//
// Vercel's Neon Postgres integration adds several connection-string env
// vars automatically (DATABASE_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING,
// POSTGRES_PRISMA_URL, ...). We never hard-code credentials here - we just
// pick whichever of those the environment provides.
const { Pool } = require('pg');

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

// Mirrors db/schema.sql. Running this (idempotently) before every cold start
// means the API works even if scripts/migrate.js was never run by hand -
// the first request against a fresh database just creates the table itself.
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

let schemaEnsuredPromise = null;

function ensureSchema(pool) {
  if (!schemaEnsuredPromise) {
    schemaEnsuredPromise = pool.query(SCHEMA_SQL).catch((err) => {
      // Let the next request try again instead of caching a failure forever.
      schemaEnsuredPromise = null;
      throw err;
    });
  }
  return schemaEnsuredPromise;
}

module.exports = { getPool, ensureSchema };
