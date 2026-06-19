import { redisServerRepository } from '../repositories/redisServer.repository.js';
import { queueRepository } from '../repositories/queue.repository.js';
import { connectionManager } from './connectionManager.js';
import { logger } from '../config/logger.js';
import type { RedisServerRow } from '../database/types.js';

export interface ServerSyncResult {
  serverId: number;
  serverName: string;
  ok: boolean;
  discovered: number;
  created: number;
  error?: string;
}

export interface SyncResult {
  servers: ServerSyncResult[];
  totalDiscovered: number;
  totalCreated: number;
}

/**
 * Extrai o nome da fila de uma chave BullMQ `bull:<nome>:id`.
 * O nome da fila pode conter ':' (ex.: `bull:meu:grupo:id`), então pegamos
 * tudo entre o primeiro `bull:` e o sufixo final `:id`.
 */
function extractQueueName(key: string): string | null {
  if (!key.startsWith('bull:') || !key.endsWith(':id')) return null;
  return key.slice('bull:'.length, key.length - ':id'.length) || null;
}

/** Varre um Redis com SCAN (não-bloqueante) procurando chaves `bull:*:id`. */
async function scanQueueNames(server: RedisServerRow): Promise<Set<string>> {
  const conn = connectionManager.get(server);
  const names = new Set<string>();
  let cursor = '0';
  do {
    const [next, keys] = await conn.scan(
      cursor,
      'MATCH',
      'bull:*:id',
      'COUNT',
      500
    );
    cursor = next;
    for (const key of keys) {
      const name = extractQueueName(key);
      if (name) names.add(name);
    }
  } while (cursor !== '0');
  return names;
}

async function syncServer(server: RedisServerRow): Promise<ServerSyncResult> {
  try {
    const names = await scanQueueNames(server);
    let created = 0;
    for (const name of names) {
      if (queueRepository.upsertDiscovered(server.id, name)) created++;
    }
    logger.info(
      { serverId: server.id, discovered: names.size, created },
      'Servidor sincronizado'
    );
    return {
      serverId: server.id,
      serverName: server.name,
      ok: true,
      discovered: names.size,
      created,
    };
  } catch (err) {
    logger.error(
      { serverId: server.id, err: (err as Error).message },
      'Falha ao sincronizar servidor'
    );
    return {
      serverId: server.id,
      serverName: server.name,
      ok: false,
      discovered: 0,
      created: 0,
      error: (err as Error).message,
    };
  }
}

export const discoveryService = {
  /** Sincroniza todos os Redis habilitados (ou um específico se id for passado). */
  async sync(redisServerId?: number): Promise<SyncResult> {
    const servers = redisServerId
      ? [redisServerRepository.findById(redisServerId)].filter(
          (s): s is RedisServerRow => !!s && !!s.enabled
        )
      : redisServerRepository.findEnabled();

    const results = await Promise.all(servers.map((s) => syncServer(s)));

    return {
      servers: results,
      totalDiscovered: results.reduce((a, r) => a + r.discovered, 0),
      totalCreated: results.reduce((a, r) => a + r.created, 0),
    };
  },
};
