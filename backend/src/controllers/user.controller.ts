import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';

export const userController = {
  list(req: Request, res: Response) {
    res.json(userService.list(req.query));
  },
  get(req: Request, res: Response) {
    res.json(userService.get(Number(req.params.id)));
  },
  create(req: Request, res: Response) {
    res.status(201).json(userService.create(req.body));
  },
  update(req: Request, res: Response) {
    res.json(userService.update(Number(req.params.id), req.body, req.user!.id));
  },
  remove(req: Request, res: Response) {
    userService.remove(Number(req.params.id), req.user!.id);
    res.status(204).send();
  },
  getAccess(req: Request, res: Response) {
    res.json(userService.getAccess(Number(req.params.id)));
  },
  setAccess(req: Request, res: Response) {
    res.json(userService.setAccess(Number(req.params.id), req.body));
  },
};
