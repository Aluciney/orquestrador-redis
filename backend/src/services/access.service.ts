import { userRepository } from '../repositories/user.repository.js';
import type { SessionUser } from './auth.service.js';

/**
 * Resolve a visibilidade de filas de um usuário.
 *
 * - Admin: vê tudo (inclusive filas não classificadas) → 'all'.
 * - Comum: vê apenas as filas cujos grupos lhe foram atribuídos (direto ou via
 *   ferramenta inteira). Filas não classificadas (sem grupo) NUNCA aparecem.
 */
export const accessService = {
  /** Retorna 'all' para admin, ou a lista de group_ids permitidos para comum. */
  allowedGroupIds(user: SessionUser): 'all' | number[] {
    if (user.isAdmin) return 'all';
    return userRepository.allowedGroupIds(user.id);
  },

  /** True se o usuário pode acessar a fila cujo grupo é `groupId` (null = não classificada). */
  canSeeGroup(user: SessionUser, groupId: number | null): boolean {
    if (user.isAdmin) return true;
    if (groupId === null) return false; // não classificadas: só admin
    return userRepository.allowedGroupIds(user.id).includes(groupId);
  },
};
