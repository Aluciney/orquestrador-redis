import type { Request, Response } from 'express';
import { queueService } from '../services/queue.service.js';
import { statsService } from '../services/stats.service.js';

export const queueController = {
  list(req: Request, res: Response) {
    res.json(queueService.list(req.query, req.user!));
  },

  get(req: Request, res: Response) {
    res.json(queueService.get(Number(req.params.id), req.user!));
  },

  async stats(req: Request, res: Response) {
    // get() já valida o acesso do usuário à fila.
    const queue = queueService.get(Number(req.params.id), req.user!);
    res.json(await statsService.queueStats(queue));
  },

  update(req: Request, res: Response) {
    const updated = queueService.update(Number(req.params.id), req.body);
    statsService.invalidate();
    res.json(updated);
  },

  remove(req: Request, res: Response) {
    queueService.remove(Number(req.params.id));
    statsService.invalidate();
    res.status(204).send();
  },
};
