import { Router } from 'express';
import redisRoutes from './redis.routes.js';
import toolsRoutes from './tools.routes.js';
import groupsRoutes from './groups.routes.js';
import queuesRoutes from './queues.routes.js';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import adConfigRoutes from './adConfig.routes.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { syncController } from '../controllers/sync.controller.js';
import { statsController } from '../controllers/stats.controller.js';
import { healthController } from '../controllers/health.controller.js';

const api = Router();

// --- Públicas ---
api.get('/health', healthController.health);
api.use('/auth', authRoutes); // /login e /me são públicos; /change-password exige sessão

// --- Daqui em diante exige autenticação ---
api.use(requireAuth);

// Gestão de usuários e config de AD (requireAdmin aplicado dentro dos routers)
api.use('/users', usersRoutes);
api.use('/ad-config', adConfigRoutes);

// Recursos administrativos
api.use('/redis', requireAdmin, redisRoutes);
api.use('/tools', requireAdmin, toolsRoutes);
api.use('/groups', requireAdmin, groupsRoutes);
api.post('/sync', requireAdmin, asyncHandler(syncController.sync));

// Leitura para todos os autenticados (escopo aplicado nos services); mutações
// de fila exigem admin (definido dentro de queues.routes.ts).
api.use('/queues', queuesRoutes);
api.get('/stats/dashboard', asyncHandler(statsController.dashboard));

export default api;
