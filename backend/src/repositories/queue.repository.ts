import { db } from '../database/db.js';
import type { QueueDetailRow, QueueRow } from '../database/types.js';

export interface QueueFilter {
  search?: string;
  redisServerId?: number;
  groupId?: number | null;
  groupIds?: number[]; // escopo do usuário comum: só estes grupos (exclui não classificadas)
  toolId?: number;
  enabled?: boolean;
  unclassified?: boolean;
  limit?: number;
  offset?: number;
}

const BASE_SELECT = `
  SELECT q.*,
         rs.name AS redis_server_name,
         g.name  AS group_name,
         t.id    AS tool_id,
         t.name  AS tool_name
  FROM queues q
  JOIN redis_servers rs ON rs.id = q.redis_server_id
  LEFT JOIN groups g    ON g.id = q.group_id
  LEFT JOIN tools  t    ON t.id = g.tool_id
`;

function buildWhere(f: QueueFilter): { clause: string; params: Record<string, unknown> } {
  const conds: string[] = [];
  const params: Record<string, unknown> = {};

  if (f.search) {
    conds.push('q.queue_name LIKE @like');
    params.like = `%${f.search}%`;
  }
  if (f.redisServerId !== undefined) {
    conds.push('q.redis_server_id = @redisServerId');
    params.redisServerId = f.redisServerId;
  }
  if (f.toolId !== undefined) {
    conds.push('t.id = @toolId');
    params.toolId = f.toolId;
  }
  if (f.groupId !== undefined && f.groupId !== null) {
    conds.push('q.group_id = @groupId');
    params.groupId = f.groupId;
  }
  if (f.groupIds !== undefined) {
    // Escopo do usuário comum. Lista vazia => não vê nenhuma fila.
    if (f.groupIds.length === 0) {
      conds.push('1 = 0');
    } else {
      conds.push(
        `q.group_id IN (${f.groupIds.map((_, i) => `@gid${i}`).join(',')})`
      );
      f.groupIds.forEach((gid, i) => {
        params[`gid${i}`] = gid;
      });
    }
  }
  if (f.unclassified) {
    conds.push('q.group_id IS NULL');
  }
  if (f.enabled !== undefined) {
    conds.push('q.enabled = @enabled');
    params.enabled = f.enabled ? 1 : 0;
  }

  return {
    clause: conds.length ? `WHERE ${conds.join(' AND ')}` : '',
    params,
  };
}

export const queueRepository = {
  findAll(filter: QueueFilter = {}): QueueDetailRow[] {
    const { clause, params } = buildWhere(filter);
    const pag = filter.limit !== undefined ? 'LIMIT @limit OFFSET @offset' : '';
    return db
      .prepare(`${BASE_SELECT} ${clause} ORDER BY q.queue_name ASC ${pag}`)
      .all({ ...params, limit: filter.limit, offset: filter.offset }) as QueueDetailRow[];
  },

  count(filter: QueueFilter = {}): number {
    const { clause, params } = buildWhere(filter);
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM queues q
         LEFT JOIN groups g ON g.id = q.group_id
         LEFT JOIN tools t ON t.id = g.tool_id
         ${clause}`
      )
      .get(params) as { c: number };
    return row.c;
  },

  findById(id: number): QueueDetailRow | undefined {
    return db.prepare(`${BASE_SELECT} WHERE q.id = ?`).get(id) as
      | QueueDetailRow
      | undefined;
  },

  findByIds(ids: number[]): QueueDetailRow[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    return db
      .prepare(`${BASE_SELECT} WHERE q.id IN (${placeholders})`)
      .all(...ids) as QueueDetailRow[];
  },

  findByServerAndName(
    redisServerId: number,
    queueName: string
  ): QueueRow | undefined {
    return db
      .prepare('SELECT * FROM queues WHERE redis_server_id = ? AND queue_name = ?')
      .get(redisServerId, queueName) as QueueRow | undefined;
  },

  /** Insere a fila se ainda não existir (usado pela descoberta). Retorna true se criou. */
  upsertDiscovered(redisServerId: number, queueName: string): boolean {
    const info = db
      .prepare(
        `INSERT OR IGNORE INTO queues (redis_server_id, queue_name)
         VALUES (?, ?)`
      )
      .run(redisServerId, queueName);
    return info.changes > 0;
  },

  /** Atualiza classificação (grupo) e/ou estado de habilitação. */
  update(
    id: number,
    fields: { group_id?: number | null; enabled?: boolean }
  ): QueueDetailRow | undefined {
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };

    if (fields.group_id !== undefined) {
      sets.push('group_id = @group_id');
      params.group_id = fields.group_id;
    }
    if (fields.enabled !== undefined) {
      sets.push('enabled = @enabled');
      params.enabled = fields.enabled ? 1 : 0;
    }
    if (sets.length > 0) {
      db.prepare(`UPDATE queues SET ${sets.join(', ')} WHERE id = @id`).run(params);
    }
    return this.findById(id);
  },

  remove(id: number): boolean {
    return db.prepare('DELETE FROM queues WHERE id = ?').run(id).changes > 0;
  },
};
