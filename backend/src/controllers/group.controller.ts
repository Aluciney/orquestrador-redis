import type { Request, Response } from 'express';
import { groupService } from '../services/group.service.js';
import { statsService } from '../services/stats.service.js';

export const groupController = {
  list(req: Request, res: Response) {
    const toolId = req.query.toolId ? Number(req.query.toolId) : undefined;
    res.json(groupService.list(toolId));
  },
  get(req: Request, res: Response) {
    res.json(groupService.get(Number(req.params.id)));
  },
  create(req: Request, res: Response) {
    const created = groupService.create(req.body);
    statsService.invalidate();
    res.status(201).json(created);
  },
  update(req: Request, res: Response) {
    res.json(groupService.update(Number(req.params.id), req.body));
  },
  remove(req: Request, res: Response) {
    groupService.remove(Number(req.params.id));
    statsService.invalidate();
    res.status(204).send();
  },
};
