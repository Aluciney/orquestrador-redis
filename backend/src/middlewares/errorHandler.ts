import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  logger.error({ err: (err as Error).message, stack: (err as Error).stack }, 'Erro não tratado');
  res.status(500).json({ error: 'Erro interno do servidor.' });
}
