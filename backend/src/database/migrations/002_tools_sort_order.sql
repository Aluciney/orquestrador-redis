-- ============================================================
-- Migration 002 — ordem de exibição das ferramentas
-- ============================================================

ALTER TABLE tools ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Inicializa a ordem das ferramentas existentes de forma determinística (por id).
UPDATE tools SET sort_order = id;

CREATE INDEX IF NOT EXISTS idx_tools_sort ON tools (sort_order);
