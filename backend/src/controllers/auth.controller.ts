import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { loadUser } from '../middlewares/auth.js';
import { COOKIE_NAME, env } from '../config/env.js';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: env.SESSION_TTL_SECONDS * 1000,
  };
}

export const authController = {
  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    const user = await authService.login(username, password);
    const token = authService.signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json(user);
  },

  logout(_req: Request, res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(204).send();
  },

  me(req: Request, res: Response) {
    const user = loadUser(req);
    if (!user) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }
    const row = userRepository.findById(user.id);
    res.json({ ...user, authType: row?.auth_type });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changeOwnPassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.status(204).send();
  },
};
