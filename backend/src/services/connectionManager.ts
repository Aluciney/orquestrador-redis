import { Redis, type RedisOptions } from 'ioredis';
import type { RedisServerRow } from '../database/types.js';
import { logger } from '../config/logger.js';

/**
 * Cache de conexões ioredis por servidor Redis cadastrado.
 *
 * - Conexões são criadas sob demanda e reutilizadas.
 * - Ao editar/desabilitar/remover um Redis, chame `invalidate(id)` para
 *   derrubar a conexão antiga; a próxima requisição recria com a config nova.
 */
class ConnectionManager {
  private readonly connections = new Map<number, Redis>();

  private buildOptions(server: RedisServerRow): RedisOptions {
    return {
      host: server.host,
      port: server.port,
      username: server.username ?? undefined,
      password: server.password ?? undefined,
      tls: server.tls ? {} : undefined,
      maxRetriesPerRequest: null, // exigido pelo BullMQ
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    };
  }

  /** Obtém (ou cria) a conexão para um servidor. */
  get(server: RedisServerRow): Redis {
    const existing = this.connections.get(server.id);
    if (existing) return existing;

    const conn = new Redis(this.buildOptions(server));
    conn.on('error', (err) => {
      logger.warn({ serverId: server.id, err: err.message }, 'Erro na conexão Redis');
    });
    this.connections.set(server.id, conn);
    logger.info({ serverId: server.id, host: server.host }, 'Conexão Redis criada');
    return conn;
  }

  /** Derruba e remove a conexão de um servidor (após editar/remover). */
  invalidate(serverId: number): void {
    const conn = this.connections.get(serverId);
    if (conn) {
      conn.disconnect();
      this.connections.delete(serverId);
      logger.info({ serverId }, 'Conexão Redis invalidada');
    }
  }

  /**
   * Testa a conectividade com um servidor SEM usar/poluir o cache.
   * Retorna latência em ms e a versão do Redis.
   */
  async test(
    server: RedisServerRow
  ): Promise<{ ok: boolean; latencyMs?: number; version?: string; error?: string }> {
    const conn = new Redis({
      ...this.buildOptions(server),
      lazyConnect: true,
      retryStrategy: () => null, // não fica retentando em teste
      connectTimeout: 5000,
    });
    const start = Date.now();
    try {
      await conn.connect();
      await conn.ping();
      const info = await conn.info('server');
      const version = /redis_version:([^\r\n]+)/.exec(info)?.[1];
      return { ok: true, latencyMs: Date.now() - start, version };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    } finally {
      conn.disconnect();
    }
  }

  async closeAll(): Promise<void> {
    for (const conn of this.connections.values()) conn.disconnect();
    this.connections.clear();
  }
}

export const connectionManager = new ConnectionManager();
