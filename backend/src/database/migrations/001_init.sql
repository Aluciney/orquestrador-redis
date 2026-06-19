-- ============================================================
-- Migration 001 — esquema inicial da plataforma
-- ============================================================

CREATE TABLE IF NOT EXISTS redis_servers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  host        TEXT    NOT NULL,
  port        INTEGER NOT NULL DEFAULT 6379,
  username    TEXT,
  password    TEXT,
  tls         INTEGER NOT NULL DEFAULT 0,   -- 0 = false, 1 = true
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tools (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  description  TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tool_id) REFERENCES tools (id) ON DELETE CASCADE,
  UNIQUE (tool_id, name)
);

CREATE TABLE IF NOT EXISTS queues (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  redis_server_id  INTEGER NOT NULL,
  group_id         INTEGER,                 -- nullable: fila descoberta mas não classificada
  queue_name       TEXT    NOT NULL,
  enabled          INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (redis_server_id) REFERENCES redis_servers (id) ON DELETE CASCADE,
  FOREIGN KEY (group_id)        REFERENCES groups (id)        ON DELETE SET NULL,
  UNIQUE (redis_server_id, queue_name)
);

CREATE INDEX IF NOT EXISTS idx_queues_group  ON queues (group_id);
CREATE INDEX IF NOT EXISTS idx_queues_server ON queues (redis_server_id);
CREATE INDEX IF NOT EXISTS idx_groups_tool   ON groups (tool_id);
