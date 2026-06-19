import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { ldapService } from './ldap.service.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import type { UserRow } from '../database/types.js';

export interface SessionUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface TokenPayload {
  sub: number;
  username: string;
  isAdmin: boolean;
}

// Segredo do JWT. Se não configurado, gera um efêmero (sessões caem no restart).
const jwtSecret =
  env.JWT_SECRET ||
  (() => {
    logger.warn(
      'JWT_SECRET não definido — usando segredo efêmero. Defina JWT_SECRET em produção.'
    );
    return bcrypt.genSaltSync(16);
  })();

export function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, username: row.username, isAdmin: !!row.is_admin };
}

export const authService = {
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  },

  signToken(user: SessionUser): string {
    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
    return jwt.sign(payload, jwtSecret, { expiresIn: env.SESSION_TTL_SECONDS });
  },

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, jwtSecret) as unknown as TokenPayload;
    } catch {
      return null;
    }
  },

  /** Autentica por usuário/senha (local ou AD conforme o cadastro). */
  async login(username: string, password: string): Promise<SessionUser> {
    const user = userRepository.findByUsername(username);
    if (!user || !user.enabled) {
      throw new AppError('Usuário ou senha inválidos.', 401);
    }

    let ok = false;
    if (user.auth_type === 'local') {
      ok = !!user.password_hash && (await bcrypt.compare(password, user.password_hash));
    } else {
      ok = await ldapService.authenticate(user.username, password);
    }

    if (!ok) throw new AppError('Usuário ou senha inválidos.', 401);
    return toSessionUser(user);
  },

  /** Troca a senha do próprio usuário local (ex.: admin). */
  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = userRepository.findById(userId);
    if (!user) throw AppError.notFound('Usuário');
    if (user.auth_type !== 'local') {
      throw AppError.badRequest('Apenas usuários locais trocam senha aqui (demais usam AD).');
    }
    const ok =
      !!user.password_hash && (await bcrypt.compare(currentPassword, user.password_hash));
    if (!ok) throw AppError.badRequest('Senha atual incorreta.');
    if (newPassword.length < 6) {
      throw AppError.badRequest('A nova senha deve ter ao menos 6 caracteres.');
    }
    userRepository.setPasswordHash(userId, await this.hashPassword(newPassword));
  },

  /** Cria o usuário admin inicial (local) se ainda não existir. */
  async ensureBootstrapAdmin(): Promise<void> {
    if (userRepository.findByUsername('admin')) return;
    const hash = await this.hashPassword(env.ADMIN_INITIAL_PASSWORD);
    userRepository.create({
      username: 'admin',
      auth_type: 'local',
      password_hash: hash,
      is_admin: true,
      enabled: true,
    });
    logger.warn(
      env.JWT_SECRET && env.ADMIN_INITIAL_PASSWORD !== 'admin'
        ? 'Usuário admin inicial criado.'
        : 'Usuário admin inicial criado com senha padrão "admin" — troque-a o quanto antes (ADMIN_INITIAL_PASSWORD).'
    );
  },
};
