// GET  /api/sections  - list every section, in display order
// POST /api/sections  - create a new section
const { getPool, ensureReady } = require('../_db');

const SELECT_COLUMNS =
  'slug, position, badge_class, badge_text, title_html, body_html, created_at, updated_at';

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

module.exports = async function handler(req, res) {
  let pool;
  try {
    pool = getPool();
    await ensureReady(pool);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
    return;
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT ${SELECT_COLUMNS} FROM sections ORDER BY position ASC, slug ASC`
      );
      res.status(200).json(rows);
      return;
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};

      let slug = slugify(body.slug) || slugify(body.title_html) || `section-${Date.now()}`;
      if (!slug) slug = `section-${Date.now()}`;

      const position = Number.isFinite(Number(body.position)) ? Number(body.position) : 9999;
      const badgeClass = typeof body.badge_class === 'string' ? body.badge_class : 'step-badge';
      const badgeText = typeof body.badge_text === 'string' ? body.badge_text : '';
      const titleHtml = typeof body.title_html === 'string' ? body.title_html : 'New section';
      const bodyHtml = typeof body.body_html === 'string' ? body.body_html : '';

      const { rows } = await pool.query(
        `INSERT INTO sections (slug, position, badge_class, badge_text, title_html, body_html)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${SELECT_COLUMNS}`,
        [slug, position, badgeClass, badgeText, titleHtml, bodyHtml]
      );
      res.status(201).json(rows[0]);
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'A section with that slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
