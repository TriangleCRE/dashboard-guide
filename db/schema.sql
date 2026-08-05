-- Content sections for the dashboard-guide site.
-- Each row is one section of the page (the intro, the "at a glance" strip,
-- each numbered step, and the tips section at the end). The front end
-- fetches these from /api/sections and renders them in `position` order.
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
