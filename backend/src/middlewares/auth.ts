import type { Request, Response, NextFunction } from 'express';
import { authService, toSessionUser, type SessionUser } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { COOKIE_NAME } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Resolve o usuário a partir do cookie de sessão (sem exigir). */
export function loadUser(req: Request): SessionUser | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const payload = authService.verifyToken(token);
  if (!payload) return null;
  // Recarrega do banco para refletir mudanças (desabilitado, admin removido).
  const row = userRepository.findById(payload.sub);
  if (!row || !row.enabled) return null;
  return toSessionUser(row);
}

/** Exige sessão válida. Popula req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const user = loadUser(req);
  if (!user) return next(new AppError('Não autenticado.', 401));
  req.user = user;
  next();
}

/** Exige que o usuário autenticado seja administrador. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AppError('Não autenticado.', 401));
  if (!req.user.isAdmin) return next(new AppError('Acesso restrito a administradores.', 403));
  next();
}
