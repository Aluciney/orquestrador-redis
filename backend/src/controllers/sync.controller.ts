import type { Request, Response } from 'express';
import { discoveryService } from '../services/discovery.service.js';
import { statsService } from '../services/stats.service.js';

export const syncController = {
  async sync(req: Request, res: Response) {
    const redisServerId = req.body?.redisServerId
      ? Number(req.body.redisServerId)
      : undefined;
    const result = await discoveryService.sync(redisServerId);
    statsService.invalidate();
    res.json(result);
  },
};
