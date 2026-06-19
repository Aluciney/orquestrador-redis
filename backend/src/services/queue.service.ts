import {
  queueRepository,
  type QueueFilter,
} from '../repositories/queue.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, paginate, type Paginated } from '../utils/pagination.js';
import type { QueueDetailRow } from '../database/types.js';

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

export const queueService = {
  list(query: Record<string, unknown>): Paginated<QueueDetailRow> {
    const p = parsePagination(query);
    const filter: QueueFilter = {
      ...toFilter(query),
      search: p.search,
      limit: p.pageSize,
      offset: p.offset,
    };
    const data = queueRepository.findAll(filter);
    const total = queueRepository.count({ ...filter, limit: undefined, offset: undefined });
    return paginate(data, total, p);
  },

  /** Lista sem paginação (para montar a árvore lateral). */
  listAll(query: Record<string, unknown> = {}): QueueDetailRow[] {
    return queueRepository.findAll({ ...toFilter(query), search: undefined });
  },

  get(id: number): QueueDetailRow {
    const row = queueRepository.findById(id);
    if (!row) throw AppError.notFound('Fila');
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
