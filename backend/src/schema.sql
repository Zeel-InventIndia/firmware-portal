-- Firmware Portal database schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  drive_folder_id TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS releases (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  note            TEXT,
  bin_file_id     TEXT,
  bin_file_name   TEXT,
  zip_file_id     TEXT,
  zip_file_name   TEXT,
  overall_status  TEXT NOT NULL DEFAULT 'pending' CHECK (overall_status IN ('pending', 'approved', 'rejected')),
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, version)
);

CREATE TABLE IF NOT EXISTS release_stages (
  id          SERIAL PRIMARY KEY,
  release_id  INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  stage_name  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  remarks     TEXT,
  updated_by  INTEGER REFERENCES users(id),
  updated_at  TIMESTAMPTZ,
  UNIQUE(release_id, stage_number)
);

CREATE TABLE IF NOT EXISTS tickets (
  id           SERIAL PRIMARY KEY,
  ticket_code  TEXT NOT NULL UNIQUE,
  designation  TEXT NOT NULL,
  name         TEXT NOT NULL,
  note         TEXT NOT NULL,
  urgency      TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  deadline     DATE,
  project_id   INTEGER REFERENCES projects(id),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
  admin_notes  TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);
CREATE INDEX IF NOT EXISTS idx_stages_release ON release_stages(release_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
