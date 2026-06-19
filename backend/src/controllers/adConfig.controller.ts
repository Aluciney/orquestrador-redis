import type { Request, Response } from 'express';
import { adConfigService } from '../services/adConfig.service.js';

export const adConfigController = {
  get(_req: Request, res: Response) {
    res.json(adConfigService.get());
  },

  update(req: Request, res: Response) {
    res.json(adConfigService.update(req.body));
  },

  async test(req: Request, res: Response) {
    const { testUsername, testPassword, ...cfg } = req.body;
    res.json(await adConfigService.test(cfg, testUsername, testPassword));
  },
};
