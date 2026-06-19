import 'dotenv/config';
import path from 'node:path';

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
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
} as const;
