import {
  redisServerRepository,
  type RedisServerInput,
} from '../repositories/redisServer.repository.js';
import { connectionManager } from './connectionManager.js';
import { queueRegistry } from './queueRegistry.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, paginate, type Paginated } from '../utils/pagination.js';
import type { RedisServerRow } from '../database/types.js';

/** Remove o campo `password` antes de enviar ao cliente. */
function sanitize(row: RedisServerRow) {
  const { password, ...rest } = row;
  return { ...rest, tls: !!row.tls, enabled: !!row.enabled, hasPassword: !!password };
}

export const redisServerService = {
  list(query: Record<string, unknown>): Paginated<ReturnType<typeof sanitize>> {
    const p = parsePagination(query);
    const rows = redisServerRepository.findAll(p.search, p.pageSize, p.offset);
    const total = redisServerRepository.count(p.search);
    return paginate(rows.map(sanitize), total, p);
  },

  get(id: number) {
    const row = redisServerRepository.findById(id);
    if (!row) throw AppError.notFound('Servidor Redis');
    return sanitize(row);
  },

  create(input: RedisServerInput) {
    const row = redisServerRepository.create(input);
    return sanitize(row);
  },

  update(id: number, input: RedisServerInput) {
    const existing = redisServerRepository.findById(id);
    if (!existing) throw AppError.notFound('Servidor Redis');
    const row = redisServerRepository.update(id, input)!;
    // Config mudou → derruba conexões antigas para recriar com novos dados.
    connectionManager.invalidate(id);
    void queueRegistry.invalidateServer(id);
    return sanitize(row);
  },

  setEnabled(id: number, enabled: boolean) {
    const existing = redisServerRepository.findById(id);
    if (!existing) throw AppError.notFound('Servidor Redis');
    const row = redisServerRepository.setEnabled(id, enabled)!;
    if (!enabled) {
      connectionManager.invalidate(id);
      void queueRegistry.invalidateServer(id);
    }
    return sanitize(row);
  },

  remove(id: number) {
    const existing = redisServerRepository.findById(id);
    if (!existing) throw AppError.notFound('Servidor Redis');
    connectionManager.invalidate(id);
    void queueRegistry.invalidateServer(id);
    redisServerRepository.remove(id);
  },

  /** Testa a conexão. Aceita id (servidor salvo) ou dados avulsos. */
  async test(id: number) {
    const row = redisServerRepository.findById(id);
    if (!row) throw AppError.notFound('Servidor Redis');
    return connectionManager.test(row);
  },

  async testRaw(input: RedisServerInput) {
    const fake: RedisServerRow = {
      id: -1,
      name: input.name,
      host: input.host,
      port: input.port,
      username: input.username ?? null,
      password: input.password ?? null,
      tls: input.tls ? 1 : 0,
      enabled: 1,
      created_at: '',
    };
    return connectionManager.test(fake);
  },
};
