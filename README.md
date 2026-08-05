# dashboard-guide

Internal playbook site: "Turn a Claude dashboard into a live, shareable, editable website."

The page content (the intro, the "at a glance" strip, each numbered step, and
the tips section) is stored in a Neon Postgres database and served through
Vercel serverless functions in `/api`, instead of being hard-coded in
`index.html`. The front end fetches the content on load and can save edits
back to the database from an in-page "Edit content" mode.

## Database

Vercel's Neon Postgres integration for this project automatically provides
connection env vars (`DATABASE_URL`, `POSTGRES_URL`, etc.) to the deployment.
Nothing is hard-coded - `api/_db.js` and the `scripts/*.js` files all read
the connection string from the environment.

**This is self-healing - no manual setup step is required.** Every API
request first calls `ensureReady()` (`api/_db.js`), which:

1. Creates the `sections` table/index if they don't already exist.
2. If - and only if - the table is completely empty, loads `db/seed-data.json`
   into it.

Because seeding only ever happens against an empty table, this can't
overwrite real edits made later through the site's "Edit content" mode -
once a single row exists, seeding is permanently skipped. So the very first
visit to the live site after a fresh database is attached is enough to set
everything up; nobody has to remember to run a script by hand.

- `db/schema.sql` - the `sections` table definition (source of truth; mirrored
  inline in `api/_db.js` so it's guaranteed to ship in the serverless bundle).
- `db/seed-data.json` - the original hard-coded guide content, extracted once
  so it can seed the table.
- `scripts/migrate.js` - creates the table/index by hand (idempotent).
- `scripts/seed.js` - loads the seed data by hand, only if the table is empty.

These scripts are optional (the API does this itself), but useful for local
work or CI. To use them against the real database from your machine:

```bash
npm install
vercel env pull .env.local --environment=production
set -a; source .env.local; set +a
npm run setup   # = npm run migrate && npm run seed
```

Note: if `DATABASE_URL`/`POSTGRES_URL` are marked **Sensitive** in the
Vercel dashboard, `vercel env pull` cannot retrieve their real values (that's
by design - sensitive vars are write-only outside of the deployed runtime).
In that case, skip the scripts and just visit the live site once instead -
the self-healing check above does the same thing automatically. If you do
need to run the scripts locally against the real database, copy the
connection string directly from the Neon console instead of via `vercel env
pull`.

## API

- `GET    /api/sections` - list all sections, ordered for display
- `POST   /api/sections` - create a section
- `GET    /api/sections/:slug` - fetch one section
- `PUT    /api/sections/:slug` - update one or more fields of a section
- `DELETE /api/sections/:slug` - remove a section

## Editing content

Click **Edit content** near the top of the page to reveal per-section edit
and delete controls plus an "Add section" button. Edits are saved to Postgres
via the API above, so they persist across refreshes and for every visitor.
