import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import apiRoutes from './routes/index.js';
import { bullBoardService } from './services/bullBoard.service.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  // Bull Board injeta CSS/JS inline; CSP do helmet quebraria o iframe.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  // Bull Board montado dinamicamente em BULL_BOARD_BASE_PATH (default /admin/queues).
  app.use(
    bullBoardService.basePath,
    bullBoardService.middleware,
    bullBoardService.getRouter()
  );

  // API REST
  app.use('/api', apiRoutes);

  // 404 + erros
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
