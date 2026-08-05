// TEMPORARY, ONE-TIME-USE endpoint.
//
// The database only seeds a row the first time the table is empty (see
// api/_db.js) - by design, it never overwrites a row that already exists.
// That's exactly right for protecting real edits, but it also means
// updating db/seed-data.json alone doesn't change what's already live.
//
// This endpoint re-syncs the already-seeded `step1` row to match the
// current db/seed-data.json content, for this one content correction
// (marking the "Your company" prompt-builder field optional). It is meant
// to be hit once via GET and then removed in a follow-up commit - it
// should not stay in the codebase long-term.
const { getPool, ensureReady } = require('./_db');
const seedData = require('../db/seed-data.json');

const RESYNC_TOKEN = 'zKYbbCVThusbt1UPJ8OAzKEAU4XkhDnK';

module.exports = async function handler(req, res) {
  if (req.query.token !== RESYNC_TOKEN) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const section = seedData.find((s) => s.slug === 'step1');
  if (!section) {
    res.status(500).json({ error: 'step1 not found in seed data' });
    return;
  }

  try {
    const pool = getPool();
    await ensureReady(pool);
    const { rows } = await pool.query(
      `UPDATE sections
       SET badge_class = $1, badge_text = $2, title_html = $3, body_html = $4, updated_at = now()
       WHERE slug = 'step1'
       RETURNING slug, updated_at`,
      [section.badge_class, section.badge_text, section.title_html, section.body_html]
    );
    res.status(200).json({ updated: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
