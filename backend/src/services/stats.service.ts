import { redisServerRepository } from '../repositories/redisServer.repository.js';
import { queueRepository } from '../repositories/queue.repository.js';
import { toolRepository } from '../repositories/tool.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { queueRegistry } from './queueRegistry.js';
import { accessService } from './access.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { QueueDetailRow } from '../database/types.js';
import type { SessionUser } from './auth.service.js';

export interface JobCounts {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
}

const EMPTY: JobCounts = {
  waiting: 0,
  active: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
  paused: 0,
};

export interface QueueStats extends QueueDetailRow {
  counts: JobCounts;
  online: boolean;
}

export interface GroupStats {
  id: number;
  name: string;
  toolId: number;
  counts: JobCounts;
  queues: QueueStats[];
}

export interface ToolStats {
  id: number;
  name: string;
  description: string | null;
  counts: JobCounts;
  groups: GroupStats[];
}

export interface DashboardStats {
  totals: JobCounts;
  tools: ToolStats[];
  unclassified: QueueStats[];
  generatedAt: string;
}

function addCounts(a: JobCounts, b: JobCounts): JobCounts {
  return {
    waiting: a.waiting + b.waiting,
    active: a.active + b.active,
    delayed: a.delayed + b.delayed,
    completed: a.completed + b.completed,
    failed: a.failed + b.failed,
    paused: a.paused + b.paused,
  };
}

class StatsService {
  private cache: { data: DashboardStats; expires: number } | null = null;

  /** Conta jobs de uma única fila. Retorna online=false se o Redis estiver fora. */
  private async countQueue(q: QueueDetailRow): Promise<QueueStats> {
    const server = redisServerRepository.findById(q.redis_server_id);
    if (!server || !server.enabled) {
      return { ...q, counts: { ...EMPTY }, online: false };
    }
    try {
      const queue = queueRegistry.get(server, q.queue_name);
      const c = await queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
        'paused'
      );
      return {
        ...q,
        online: true,
        counts: {
          waiting: c.waiting ?? 0,
          active: c.active ?? 0,
          delayed: c.delayed ?? 0,
          completed: c.completed ?? 0,
          failed: c.failed ?? 0,
          paused: c.paused ?? 0,
        },
      };
    } catch (err) {
      logger.warn(
        { queue: q.queue_name, err: (err as Error).message },
        'Falha ao obter contagem da fila'
      );
      return { ...q, counts: { ...EMPTY }, online: false };
    }
  }

  /** Estatísticas de uma fila isolada (sem cache). */
  async queueStats(q: QueueDetailRow): Promise<QueueStats> {
    return this.countQueue(q);
  }

  /** Dashboard agregado (fila → grupo → ferramenta) com cache curto. */
  async dashboard(force = false): Promise<DashboardStats> {
    if (!force && this.cache && this.cache.expires > Date.now()) {
      return this.cache.data;
    }

    const queues = queueRepository.findAll({ enabled: true });
    const statsByQueue = await Promise.all(queues.map((q) => this.countQueue(q)));

    // Indexa por id da fila para reaproveitar.
    const byId = new Map(statsByQueue.map((s) => [s.id, s]));

    const tools = toolRepository.findAll();
    const toolStats: ToolStats[] = tools.map((tool) => {
      const groups = groupRepository.findAll(tool.id);
      const groupStats: GroupStats[] = groups.map((g) => {
        const qs = statsByQueue.filter((s) => s.group_id === g.id);
        const counts = qs.reduce((acc, s) => addCounts(acc, s.counts), { ...EMPTY });
        return { id: g.id, name: g.name, toolId: tool.id, counts, queues: qs };
      });
      const counts = groupStats.reduce((acc, g) => addCounts(acc, g.counts), {
        ...EMPTY,
      });
      return {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        counts,
        groups: groupStats,
      };
    });

    const unclassified = statsByQueue.filter((s) => s.group_id === null);
    const totals = statsByQueue.reduce((acc, s) => addCounts(acc, s.counts), {
      ...EMPTY,
    });

    const data: DashboardStats = {
      totals,
      tools: toolStats,
      unclassified,
      generatedAt: new Date().toISOString(),
    };

    void byId; // (mantido para extensões futuras)
    this.cache = { data, expires: Date.now() + env.STATS_CACHE_TTL_MS };
    return data;
  }

  /**
   * Dashboard com escopo do usuário. Admin recebe tudo; usuário comum recebe
   * apenas as ferramentas/grupos permitidos (sem filas não classificadas).
   * Reaproveita o cache global e apenas filtra a resposta.
   */
  async dashboardForUser(user: SessionUser, force = false): Promise<DashboardStats> {
    const full = await this.dashboard(force);
    const allowed = accessService.allowedGroupIds(user);
    if (allowed === 'all') return full;

    const allowedSet = new Set(allowed);
    const tools: ToolStats[] = full.tools
      .map((tool) => {
        const groups = tool.groups.filter((g) => allowedSet.has(g.id));
        const counts = groups.reduce((acc, g) => addCounts(acc, g.counts), { ...EMPTY });
        return { ...tool, groups, counts };
      })
      .filter((tool) => tool.groups.length > 0);

    const totals = tools.reduce((acc, t) => addCounts(acc, t.counts), { ...EMPTY });

    return {
      totals,
      tools,
      unclassified: [], // não classificadas: só admin
      generatedAt: full.generatedAt,
    };
  }

  invalidate(): void {
    this.cache = null;
  }
}

export const statsService = new StatsService();
