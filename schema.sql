-- ============================================================
-- BLOCNOTE — Schéma Supabase (PostgreSQL)
-- Coller ce contenu dans SQL Editor > Run
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM types
-- ============================================================

DO $$ BEGIN
  CREATE TYPE note_type AS ENUM ('calendar', 'standalone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE widget_size AS ENUM ('small', 'medium', 'large');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE widget_position AS ENUM ('sidebar', 'float', 'page');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLE: projects
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#7c3aed',
  icon       TEXT NOT NULL DEFAULT 'folder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: tags
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#7c3aed'
);

-- ============================================================
-- TABLE: notes
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  type       note_type NOT NULL DEFAULT 'standalone',
  date       DATE,
  hour       SMALLINT CHECK (hour IS NULL OR (hour >= 0 AND hour <= 23)),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_favorite  BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one note per calendar day/hour slot
CREATE UNIQUE INDEX IF NOT EXISTS notes_calendar_slot_idx
  ON notes (date, hour)
  WHERE type = 'calendar' AND is_deleted = FALSE AND hour IS NOT NULL;

-- Indices for common queries
CREATE INDEX IF NOT EXISTS notes_type_idx        ON notes (type);
CREATE INDEX IF NOT EXISTS notes_date_idx        ON notes (date);
CREATE INDEX IF NOT EXISTS notes_project_idx     ON notes (project_id);
CREATE INDEX IF NOT EXISTS notes_deleted_idx     ON notes (is_deleted);
CREATE INDEX IF NOT EXISTS notes_favorite_idx    ON notes (is_favorite);
CREATE INDEX IF NOT EXISTS notes_updated_idx     ON notes (updated_at DESC);
-- Full-text search
CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes
  USING gin(to_tsvector('french', coalesce(title,'') || ' ' || coalesce(content,'')));

-- ============================================================
-- TABLE: notes_tags  (many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS notes_tags (
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- ============================================================
-- TABLE: daily_journal
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_journal (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date       DATE NOT NULL UNIQUE,
  content    TEXT NOT NULL DEFAULT '',
  mood       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS journal_date_idx ON daily_journal (date DESC);
-- Full-text search
CREATE INDEX IF NOT EXISTS journal_fts_idx ON daily_journal
  USING gin(to_tsvector('french', coalesce(content,'')));

-- ============================================================
-- TABLE: note_versions
-- ============================================================

CREATE TABLE IF NOT EXISTS note_versions (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content  TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS versions_note_idx    ON note_versions (note_id);
CREATE INDEX IF NOT EXISTS versions_saved_idx   ON note_versions (saved_at DESC);

-- ============================================================
-- TABLE: widgets
-- ============================================================

CREATE TABLE IF NOT EXISTS widgets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL DEFAULT '',
  secrets    JSONB NOT NULL DEFAULT '{}',
  storage    JSONB NOT NULL DEFAULT '{}',
  size       widget_size NOT NULL DEFAULT 'small',
  position   widget_position NOT NULL DEFAULT 'sidebar',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: app_settings  (single row)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  theme               TEXT NOT NULL DEFAULT 'dark',
  editor_font         TEXT NOT NULL DEFAULT 'mono',
  font_size           INT  NOT NULL DEFAULT 14,
  max_editor_width    INT  NOT NULL DEFAULT 800,
  show_milliseconds   BOOLEAN NOT NULL DEFAULT TRUE,
  alert_sound         TEXT NOT NULL DEFAULT 'beep',
  show_timer_sidebar  BOOLEAN NOT NULL DEFAULT TRUE,
  session_timeout     INT NOT NULL DEFAULT 60
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- TRIGGERS: updated_at auto-refresh
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_updated_at        ON notes;
DROP TRIGGER IF EXISTS journal_updated_at      ON daily_journal;
DROP TRIGGER IF EXISTS widgets_updated_at      ON widgets;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON daily_journal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER widgets_updated_at
  BEFORE UPDATE ON widgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: auto-set deleted_at when is_deleted = true
-- ============================================================

CREATE OR REPLACE FUNCTION set_deleted_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    NEW.deleted_at = NOW();
  ELSIF NEW.is_deleted = FALSE THEN
    NEW.deleted_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_deleted_at ON notes;
CREATE TRIGGER notes_deleted_at
  BEFORE UPDATE OF is_deleted ON notes
  FOR EACH ROW EXECUTE FUNCTION set_deleted_at();

-- ============================================================
-- TRIGGER: keep max 10 versions per note + purge >90 days
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_note_versions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Delete versions older than 90 days for this note
  DELETE FROM note_versions
  WHERE note_id = NEW.note_id
    AND saved_at < NOW() - INTERVAL '90 days';

  -- Keep only the 10 most recent versions
  DELETE FROM note_versions
  WHERE note_id = NEW.note_id
    AND id NOT IN (
      SELECT id FROM note_versions
      WHERE note_id = NEW.note_id
      ORDER BY saved_at DESC
      LIMIT 10
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS limit_note_versions ON note_versions;
CREATE TRIGGER limit_note_versions
  AFTER INSERT ON note_versions
  FOR EACH ROW EXECUTE FUNCTION cleanup_note_versions();

-- ============================================================
-- TRIGGER: auto-purge notes in trash after 30 days
-- ============================================================

CREATE OR REPLACE FUNCTION purge_old_deleted_notes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM notes
  WHERE is_deleted = TRUE
    AND deleted_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$;

-- Runs on every new note insert (lightweight, just checks once)
DROP TRIGGER IF EXISTS auto_purge_trash ON notes;
CREATE TRIGGER auto_purge_trash
  AFTER INSERT ON notes
  FOR EACH ROW EXECUTE FUNCTION purge_old_deleted_notes();

-- ============================================================
-- ROW LEVEL SECURITY — disable for single-user app
-- (all access is controlled via server-side auth cookie)
-- ============================================================

ALTER TABLE notes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journal  DISABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects       DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags           DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes_tags     DISABLE ROW LEVEL SECURITY;
ALTER TABLE widgets        DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings   DISABLE ROW LEVEL SECURITY;
