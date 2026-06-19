import { Queue } from 'bullmq';
import type { RedisServerRow } from '../database/types.js';
import { connectionManager } from './connectionManager.js';
import { logger } from '../config/logger.js';

/**
 * Cache de instâncias `Queue` do BullMQ, indexadas por `serverId:queueName`.
 * Cada Queue compartilha a conexão ioredis do seu servidor de origem
 * (via ConnectionManager).
 */
class QueueRegistry {
  private readonly queues = new Map<string, Queue>();

  private key(serverId: number, queueName: string): string {
    return `${serverId}:${queueName}`;
  }

  get(server: RedisServerRow, queueName: string): Queue {
    const key = this.key(server.id, queueName);
    const existing = this.queues.get(key);
    if (existing) return existing;

    const connection = connectionManager.get(server);
    const queue = new Queue(queueName, { connection });
    this.queues.set(key, queue);
    return queue;
  }

  async invalidateServer(serverId: number): Promise<void> {
    for (const [key, queue] of this.queues.entries()) {
      if (key.startsWith(`${serverId}:`)) {
        await queue.close().catch(() => undefined);
        this.queues.delete(key);
      }
    }
    logger.info({ serverId }, 'Filas do servidor invalidadas no registry');
  }

  async closeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close().catch(() => undefined);
    }
    this.queues.clear();
  }
}

export const queueRegistry = new QueueRegistry();
