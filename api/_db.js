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

module.exports = { getPool };
