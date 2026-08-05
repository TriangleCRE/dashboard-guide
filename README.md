# dashboard-guide

Internal playbook site: "Turn a Claude dashboard into a live, shareable, editable website."

The page content (the intro, the "at a glance" strip, each numbered step, and
the tips section) is stored in a Neon Postgres database and served through
Vercel serverless functions in `/api`, instead of being hard-coded in
`index.html`. The front end fetches the content on load and can save edits
back to the database from an in-page "Edit content" mode.

## Database

Vercel's Neon Postgres integration for this project automatically provides
connection env vars (`DATABASE_URL`, `POSTGRES_URL`, etc.) to the deployment
and to `vercel env pull`. Nothing is hard-coded - `api/_db.js` and
`scripts/migrate.js` both read the connection string from the environment.

- `db/schema.sql` - the `sections` table definition.
- `db/seed-data.json` - the original hard-coded guide content, extracted once
  so it can seed the table.
- `scripts/migrate.js` - creates the table if it doesn't exist and seeds it
  (skips rows that already exist, so it's safe to re-run).

To set up (or reset) the database locally:

```bash
npm install
vercel env pull .env.local   # or export DATABASE_URL yourself
export $(grep -v '^#' .env.local | xargs)   # if using .env.local
npm run migrate
```

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
