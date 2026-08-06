// TEMPORARY, ONE-TIME-USE endpoint.
//
// The database only seeds a row the first time the table is empty (see
// api/_db.js) - by design, it never overwrites a row that already exists.
// That's exactly right for protecting real edits, but it also means
// updating db/seed-data.json alone doesn't change what's already live.
//
// This endpoint re-syncs the content added for the "Add a Dashboard Hub
// home button" step: it inserts the new `step10` row (which doesn't exist
// yet in the live database) and updates `glance`, `step7`, and `tips` to
// match their current db/seed-data.json wording. It is meant to be hit
// once via GET and then removed in a follow-up commit - it should not
// stay in the codebase long-term.
const { getPool, ensureReady } = require('./_db');
const seedData = require('../db/seed-data.json');

const RESYNC_TOKEN = 'jLHGRg0h9ZCMuaJei2SFshSHu5o8uEb_';
const SLUGS = ['glance', 'step7', 'step10', 'tips'];

module.exports = async function handler(req, res) {
  if (req.query.token !== RESYNC_TOKEN) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const pool = getPool();
    await ensureReady(pool);

    const results = [];
    for (const slug of SLUGS) {
      const section = seedData.find((s) => s.slug === slug);
      if (!section) {
        results.push({ slug, error: 'not found in seed data' });
        continue;
      }

      const { rows } = await pool.query(
        `INSERT INTO sections (slug, position, badge_class, badge_text, title_html, body_html)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           position = EXCLUDED.position,
           badge_class = EXCLUDED.badge_class,
           badge_text = EXCLUDED.badge_text,
           title_html = EXCLUDED.title_html,
           body_html = EXCLUDED.body_html,
           updated_at = now()
         RETURNING slug, position, updated_at`,
        [
          section.slug,
          section.position,
          section.badge_class,
          section.badge_text,
          section.title_html,
          section.body_html,
        ]
      );
      results.push(rows[0]);
    }

    res.status(200).json({ synced: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
