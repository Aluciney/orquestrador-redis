import { Router } from 'express';
import { queueController } from '../controllers/queue.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validateBody } from '../middlewares/validate.js';
import { requireAdmin } from '../middlewares/auth.js';
import { queueUpdateSchema } from '../schemas/index.js';

const router = Router();

// Leitura: qualquer usuário autenticado (escopo aplicado no service).
router.get('/', queueController.list);
router.get('/:id', queueController.get);
router.get('/:id/stats', asyncHandler(queueController.stats));

// Mutações: somente administradores.
router.put('/:id', requireAdmin, validateBody(queueUpdateSchema), queueController.update);
router.delete('/:id', requireAdmin, queueController.remove);

export default router;
