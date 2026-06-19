import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { runMigrations } from './database/migrate.js';
import { connectionManager } from './services/connectionManager.js';
import { queueRegistry } from './services/queueRegistry.js';
import { authService } from './services/auth.service.js';

runMigrations();
await authService.ensureBootstrapAdmin();

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(
    `🚀 Backend ativo em http://localhost:${env.PORT}  | Bull Board: ${env.BULL_BOARD_BASE_PATH}`
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Encerrando...');
  server.close();
  await queueRegistry.closeAll();
  await connectionManager.closeAll();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
