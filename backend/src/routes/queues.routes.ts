import { Router } from 'express';
import { queueController } from '../controllers/queue.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validateBody } from '../middlewares/validate.js';
import { queueUpdateSchema } from '../schemas/index.js';

const router = Router();

router.get('/', queueController.list);
router.get('/:id', queueController.get);
router.get('/:id/stats', asyncHandler(queueController.stats));
router.put('/:id', validateBody(queueUpdateSchema), queueController.update);
router.delete('/:id', queueController.remove);

export default router;
