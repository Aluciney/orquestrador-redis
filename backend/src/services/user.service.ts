import { userRepository, type UserAccess } from '../repositories/user.repository.js';
import { toolRepository } from '../repositories/tool.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, paginate, type Paginated } from '../utils/pagination.js';
import type { UserRow } from '../database/types.js';

const BOOTSTRAP_ADMIN = 'admin';

/** Remove o hash de senha antes de enviar ao cliente. */
function sanitize(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    auth_type: row.auth_type,
    is_admin: !!row.is_admin,
    enabled: !!row.enabled,
    created_at: row.created_at,
    isBootstrapAdmin: row.username === BOOTSTRAP_ADMIN,
  };
}

export const userService = {
  list(query: Record<string, unknown>): Paginated<ReturnType<typeof sanitize>> {
    const p = parsePagination(query);
    const rows = userRepository.findAll(p.search, p.pageSize, p.offset);
    const total = userRepository.count(p.search);
    return paginate(rows.map(sanitize), total, p);
  },

  get(id: number) {
    const row = userRepository.findById(id);
    if (!row) throw AppError.notFound('Usuário');
    return sanitize(row);
  },

  /** Cria um usuário AD (login sempre via AD; sem senha local). */
  create(input: { username: string; is_admin: boolean }) {
    const username = input.username.trim();
    if (!username) throw AppError.badRequest('Username é obrigatório.');
    if (userRepository.findByUsername(username)) {
      throw AppError.conflict('Já existe um usuário com esse username.');
    }
    const row = userRepository.create({
      username,
      auth_type: 'ad',
      is_admin: input.is_admin,
      enabled: true,
    });
    return sanitize(row);
  },

  update(
    id: number,
    fields: { is_admin?: boolean; enabled?: boolean },
    actingUserId: number
  ) {
    const user = userRepository.findById(id);
    if (!user) throw AppError.notFound('Usuário');

    // Não permitir rebaixar/desabilitar o último admin ativo.
    const removingAdminPower =
      (fields.is_admin === false || fields.enabled === false) && user.is_admin === 1;
    if (removingAdminPower && userRepository.countAdmins() <= 1) {
      throw AppError.badRequest('Não é possível remover o último administrador ativo.');
    }
    // Não permitir desabilitar a si mesmo.
    if (fields.enabled === false && id === actingUserId) {
      throw AppError.badRequest('Você não pode desabilitar a si mesmo.');
    }
    return sanitize(userRepository.update(id, fields)!);
  },

  remove(id: number, actingUserId: number) {
    const user = userRepository.findById(id);
    if (!user) throw AppError.notFound('Usuário');
    if (user.username === BOOTSTRAP_ADMIN) {
      throw AppError.badRequest('O usuário admin inicial não pode ser removido.');
    }
    if (id === actingUserId) {
      throw AppError.badRequest('Você não pode remover a si mesmo.');
    }
    if (user.is_admin === 1 && userRepository.countAdmins() <= 1) {
      throw AppError.badRequest('Não é possível remover o último administrador ativo.');
    }
    userRepository.remove(id);
  },

  getAccess(id: number): UserAccess {
    if (!userRepository.findById(id)) throw AppError.notFound('Usuário');
    return userRepository.getAccess(id);
  },

  setAccess(id: number, access: UserAccess): UserAccess {
    if (!userRepository.findById(id)) throw AppError.notFound('Usuário');
    for (const tid of access.toolIds) {
      if (!toolRepository.findById(tid)) {
        throw AppError.badRequest(`Ferramenta ${tid} inexistente.`);
      }
    }
    for (const gid of access.groupIds) {
      if (!groupRepository.findById(gid)) {
        throw AppError.badRequest(`Grupo ${gid} inexistente.`);
      }
    }
    userRepository.setAccess(id, access);
    return userRepository.getAccess(id);
  },
};
