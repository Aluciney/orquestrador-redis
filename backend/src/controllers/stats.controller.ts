import type { Request, Response } from 'express';
import { statsService } from '../services/stats.service.js';

export const statsController = {
  async dashboard(req: Request, res: Response) {
    const force = req.query.force === 'true' || req.query.force === '1';
    res.json(await statsService.dashboardForUser(req.user!, force));
  },
};
