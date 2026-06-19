import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Garante que o diretório do arquivo SQLite exista.
const dir = path.dirname(env.DATABASE_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(env.DATABASE_PATH);

// PRAGMAs de performance/segurança recomendados para SQLite em apps web.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

logger.info({ path: env.DATABASE_PATH }, 'SQLite conectado');
