-- ============================================================
-- Migration 004 — configuração do Active Directory no banco
-- (substitui as variáveis de ambiente AD_*)
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_config (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  url                      TEXT    NOT NULL DEFAULT '',
  base_dn                  TEXT    NOT NULL DEFAULT '',
  bind_dn                  TEXT    NOT NULL DEFAULT '',
  bind_password            TEXT    NOT NULL DEFAULT '',
  search_filter            TEXT    NOT NULL DEFAULT '(sAMAccountName={{username}})',
  tls_reject_unauthorized  INTEGER NOT NULL DEFAULT 1,
  enabled                  INTEGER NOT NULL DEFAULT 0,
  updated_at               TEXT
);

-- Linha única de configuração.
INSERT OR IGNORE INTO ad_config (id) VALUES (1);
