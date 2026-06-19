import type { Request, Response } from 'express';
import { redisServerService } from '../services/redisServer.service.js';
import { statsService } from '../services/stats.service.js';

export const redisServerController = {
  list(req: Request, res: Response) {
    res.json(redisServerService.list(req.query));
  },

  get(req: Request, res: Response) {
    res.json(redisServerService.get(Number(req.params.id)));
  },

  create(req: Request, res: Response) {
    const created = redisServerService.create(req.body);
    statsService.invalidate();
    res.status(201).json(created);
  },

  update(req: Request, res: Response) {
    const updated = redisServerService.update(Number(req.params.id), req.body);
    statsService.invalidate();
    res.json(updated);
  },

  setEnabled(req: Request, res: Response) {
    const updated = redisServerService.setEnabled(
      Number(req.params.id),
      req.body.enabled
    );
    statsService.invalidate();
    res.json(updated);
  },

  remove(req: Request, res: Response) {
    redisServerService.remove(Number(req.params.id));
    statsService.invalidate();
    res.status(204).send();
  },

  async test(req: Request, res: Response) {
    const result = await redisServerService.test(Number(req.params.id));
    res.json(result);
  },

  async testRaw(req: Request, res: Response) {
    const result = await redisServerService.testRaw(req.body);
    res.json(result);
  },
};
