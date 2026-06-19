import type { Request, Response } from 'express';
import { toolService } from '../services/tool.service.js';
import { statsService } from '../services/stats.service.js';

export const toolController = {
  list(req: Request, res: Response) {
    res.json(toolService.list(req.query));
  },
  get(req: Request, res: Response) {
    res.json(toolService.get(Number(req.params.id)));
  },
  create(req: Request, res: Response) {
    const created = toolService.create(req.body);
    statsService.invalidate();
    res.status(201).json(created);
  },
  reorder(req: Request, res: Response) {
    const tools = toolService.reorder(req.body.ids);
    statsService.invalidate();
    res.json(tools);
  },
  update(req: Request, res: Response) {
    res.json(toolService.update(Number(req.params.id), req.body));
  },
  remove(req: Request, res: Response) {
    toolService.remove(Number(req.params.id));
    statsService.invalidate();
    res.status(204).send();
  },
};
