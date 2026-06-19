import {
  queueRepository,
  type QueueFilter,
} from '../repositories/queue.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { accessService } from './access.service.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, paginate, type Paginated } from '../utils/pagination.js';
import type { QueueDetailRow } from '../database/types.js';
import type { SessionUser } from './auth.service.js';

function toFilter(query: Record<string, unknown>): QueueFilter {
  const num = (v: unknown) =>
    v !== undefined && v !== '' ? Number.parseInt(String(v), 10) : undefined;
  return {
    redisServerId: num(query.redisServerId),
    toolId: num(query.toolId),
    groupId: num(query.groupId),
    unclassified: query.unclassified === 'true' || query.unclassified === '1',
    enabled:
      query.enabled === undefined || query.enabled === ''
        ? undefined
        : query.enabled === 'true' || query.enabled === '1',
  };
}

/** Aplica o escopo de visibilidade do usuário ao filtro de filas. */
function applyScope(filter: QueueFilter, user: SessionUser): QueueFilter {
  const allowed = accessService.allowedGroupIds(user);
  if (allowed === 'all') return filter; // admin: sem restrição
  // Usuário comum: só os grupos permitidos (exclui não classificadas).
  return { ...filter, groupIds: allowed, unclassified: false };
}

export const queueService = {
  list(query: Record<string, unknown>, user: SessionUser): Paginated<QueueDetailRow> {
    const p = parsePagination(query);
    const filter = applyScope(
      {
        ...toFilter(query),
        search: p.search,
        limit: p.pageSize,
        offset: p.offset,
      },
      user
    );
    const data = queueRepository.findAll(filter);
    const total = queueRepository.count({ ...filter, limit: undefined, offset: undefined });
    return paginate(data, total, p);
  },

  /** Lista sem paginação (para montar a árvore lateral). */
  listAll(query: Record<string, unknown>, user: SessionUser): QueueDetailRow[] {
    return queueRepository.findAll(
      applyScope({ ...toFilter(query), search: undefined }, user)
    );
  },

  get(id: number, user: SessionUser): QueueDetailRow {
    const row = queueRepository.findById(id);
    if (!row) throw AppError.notFound('Fila');
    if (!accessService.canSeeGroup(user, row.group_id)) {
      throw new AppError('Acesso negado a esta fila.', 403);
    }
    return row;
  },

  /** Move fila para um grupo (classificação) e/ou habilita/desabilita. */
  update(
    id: number,
    fields: { group_id?: number | null; enabled?: boolean }
  ): QueueDetailRow {
    if (!queueRepository.findById(id)) throw AppError.notFound('Fila');
    if (
      fields.group_id !== undefined &&
      fields.group_id !== null &&
      !groupRepository.findById(fields.group_id)
    ) {
      throw AppError.badRequest('Grupo (group_id) inexistente.');
    }
    return queueRepository.update(id, fields)!;
  },

  remove(id: number): void {
    if (!queueRepository.findById(id)) throw AppError.notFound('Fila');
    queueRepository.remove(id);
  },
};
