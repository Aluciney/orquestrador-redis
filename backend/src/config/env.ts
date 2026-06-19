import 'dotenv/config';
import path from 'node:path';

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  PORT: int(process.env.PORT, 4000),
  DATABASE_PATH: path.resolve(
    process.env.DATABASE_PATH ?? './data/orquestrador.sqlite'
  ),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
  STATS_CACHE_TTL_MS: int(process.env.STATS_CACHE_TTL_MS, 5000),
  BULL_BOARD_BASE_PATH: process.env.BULL_BOARD_BASE_PATH ?? '/admin/queues',
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // --- Autenticação / sessão ---
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  SESSION_TTL_SECONDS: int(process.env.SESSION_TTL, 60 * 60 * 8), // 8h
  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, false),
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD ?? 'admin',
} as const;

// A configuração do Active Directory agora vive no banco (tabela ad_config),
// gerenciada pela tela de Configuração de AD. Ver services/ldap.service.ts.

export const COOKIE_NAME = 'session';
