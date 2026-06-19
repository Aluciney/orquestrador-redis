-- ============================================================
-- Migration 003 — autenticação, perfis e visibilidade de filas
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  auth_type     TEXT    NOT NULL DEFAULT 'ad',   -- 'local' | 'ad'
  password_hash TEXT,                            -- apenas para auth_type = 'local'
  is_admin      INTEGER NOT NULL DEFAULT 0,
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Acesso a uma ferramenta inteira (todos os grupos dela).
CREATE TABLE IF NOT EXISTS user_tool_access (
  user_id INTEGER NOT NULL,
  tool_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, tool_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES tools (id) ON DELETE CASCADE
);

-- Acesso a um grupo específico.
CREATE TABLE IF NOT EXISTS user_group_access (
  user_id  INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_uta_user ON user_tool_access (user_id);
CREATE INDEX IF NOT EXISTS idx_uga_user ON user_group_access (user_id);
