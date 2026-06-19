import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError.js';

/** Valida `req.body` contra um schema zod, substituindo-o pelo valor parseado. */
export function validateBody(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        AppError.badRequest('Dados inválidos.', result.error.flatten())
      );
    }
    req.body = result.data;
    next();
  };
}
