import { Router } from 'express';
import redisRoutes from './redis.routes.js';
import toolsRoutes from './tools.routes.js';
import groupsRoutes from './groups.routes.js';
import queuesRoutes from './queues.routes.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { syncController } from '../controllers/sync.controller.js';
import { statsController } from '../controllers/stats.controller.js';
import { healthController } from '../controllers/health.controller.js';

const api = Router();

api.use('/redis', redisRoutes);
api.use('/tools', toolsRoutes);
api.use('/groups', groupsRoutes);
api.use('/queues', queuesRoutes);

api.post('/sync', asyncHandler(syncController.sync));
api.get('/stats/dashboard', asyncHandler(statsController.dashboard));
api.get('/health', healthController.health);

export default api;
