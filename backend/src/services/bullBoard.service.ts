import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { redisServerRepository } from '../repositories/redisServer.repository.js';
import { queueRepository } from '../repositories/queue.repository.js';
import { queueRegistry } from './queueRegistry.js';
import { logger } from '../config/logger.js';

const FILTER_COOKIE = 'bb_queues';

/**
 * Bull Board montado dinamicamente.
 *
 * As filas exibidas são definidas por requisição: o frontend abre cada fila num
 * iframe `?queues=<id,id,...>` (ids da nossa tabela). Sem filtro, mostra todas
 * as filas habilitadas.
 *
 * DESAFIO: o Bull Board é um SPA. Só o **carregamento inicial do HTML** chega com
 * `?queues=1`; as chamadas XHR internas (ex.: `/api/queues`) NÃO repassam esse
 * query param, e o `Referer` é removido/reescrito pela referrer-policy e pelo
 * roteamento client-side. Por isso, no carregamento do HTML gravamos um **cookie**
 * (escopado ao basePath). Cookies são enviados em toda requisição same-origin,
 * então as XHR internas mantêm o mesmo filtro de forma confiável.
 *
 * Ordem de resolução do filtro: query `?queues=` → cookie → `Referer` (fallback).
 *
 * Como nomes de fila só são únicos DENTRO de um mesmo Redis, exibir uma visão
 * filtrada (por fila/grupo/ferramenta) evita colisões entre servidores.
 */
class BullBoardService {
  private readonly serverAdapter = new ExpressAdapter();
  private readonly replaceQueues: ReturnType<typeof createBullBoard>['replaceQueues'];

  constructor() {
    this.serverAdapter.setBasePath(env.BULL_BOARD_BASE_PATH);
    const board = createBullBoard({ queues: [], serverAdapter: this.serverAdapter });
    this.replaceQueues = board.replaceQueues;
  }

  private parseCookie(req: Request, name: string): string | undefined {
    const raw = req.headers.cookie;
    if (!raw) return undefined;
    for (const part of raw.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      if (part.slice(0, idx).trim() === name) {
        return decodeURIComponent(part.slice(idx + 1).trim());
      }
    }
    return undefined;
  }

  private parseIds(raw: string): number[] {
    return raw
      ? raw
          .split(',')
          .map((s) => Number.parseInt(s, 10))
          .filter((n) => Number.isFinite(n))
      : [];
  }

  /** Resolve o filtro bruto: query → cookie → referer. */
  private resolveRaw(req: Request): string {
    const fromQuery = String(req.query.queues ?? '').trim();
    if (fromQuery) return fromQuery;

    const fromCookie = this.parseCookie(req, FILTER_COOKIE);
    if (fromCookie) return fromCookie.trim();

    if (typeof req.headers.referer === 'string') {
      try {
        const u = new URL(req.headers.referer);
        return (u.searchParams.get('queues') ?? '').trim();
      } catch {
        /* referer inválido — ignora */
      }
    }
    return '';
  }

  /** Middleware que recarrega as filas do board conforme o filtro vigente. */
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // No carregamento do HTML do iframe (query presente), persiste o filtro
      // num cookie para que as XHR internas do SPA o mantenham.
      if (req.query.queues !== undefined) {
        const value = String(req.query.queues ?? '').trim();
        if (value) {
          res.cookie(FILTER_COOKIE, value, {
            path: env.BULL_BOARD_BASE_PATH,
            sameSite: 'lax',
            httpOnly: false,
          });
        } else {
          // `?queues=` vazio → limpa o filtro (volta a mostrar todas).
          res.clearCookie(FILTER_COOKIE, { path: env.BULL_BOARD_BASE_PATH });
        }
      }

      const ids = this.parseIds(this.resolveRaw(req));

      const rows =
        ids.length > 0
          ? queueRepository.findByIds(ids)
          : queueRepository.findAll({ enabled: true });

      const adapters = rows
        .map((q) => {
          const server = redisServerRepository.findById(q.redis_server_id);
          if (!server || !server.enabled) return null;
          const queue = queueRegistry.get(server, q.queue_name);
          return new BullMQAdapter(queue);
        })
        .filter((a): a is BullMQAdapter => a !== null);

      this.replaceQueues(adapters);
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Falha ao montar Bull Board');
    }
    next();
  };

  getRouter() {
    return this.serverAdapter.getRouter();
  }

  get basePath() {
    return env.BULL_BOARD_BASE_PATH;
  }
}

export const bullBoardService = new BullBoardService();
