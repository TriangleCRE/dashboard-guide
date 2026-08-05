// GET    /api/sections/:slug  - fetch one section
// PUT    /api/sections/:slug  - update one or more fields of a section
// DELETE /api/sections/:slug  - remove a section
const { getPool } = require('../_db');

const SELECT_COLUMNS =
  'slug, position, badge_class, badge_text, title_html, body_html, created_at, updated_at';

const UPDATABLE_FIELDS = ['position', 'badge_class', 'badge_text', 'title_html', 'body_html'];

module.exports = async function handler(req, res) {
  let pool;
  try {
    pool = getPool();
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  const { slug } = req.query;
  if (!slug) {
    res.status(400).json({ error: 'Missing slug' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query(`SELECT ${SELECT_COLUMNS} FROM sections WHERE slug = $1`, [
        slug,
      ]);
      if (!rows.length) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(rows[0]);
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sets = [];
      const values = [];
      let i = 1;

      for (const field of UPDATABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          sets.push(`${field} = $${i}`);
          values.push(body[field]);
          i += 1;
        }
      }

      if (!sets.length) {
        res.status(400).json({ error: 'No updatable fields provided' });
        return;
      }

      sets.push('updated_at = now()');
      values.push(slug);

      const { rows } = await pool.query(
        `UPDATE sections SET ${sets.join(', ')} WHERE slug = $${i} RETURNING ${SELECT_COLUMNS}`,
        values
      );
      if (!rows.length) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(rows[0]);
      return;
    }

    if (req.method === 'DELETE') {
      const { rowCount } = await pool.query('DELETE FROM sections WHERE slug = $1', [slug]);
      if (!rowCount) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
