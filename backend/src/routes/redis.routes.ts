import { Router } from 'express';
import { redisServerController } from '../controllers/redisServer.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validateBody } from '../middlewares/validate.js';
import { redisServerSchema, enabledSchema } from '../schemas/index.js';

const router = Router();

router.get('/', redisServerController.list);
router.post('/', validateBody(redisServerSchema), redisServerController.create);
router.post('/test', validateBody(redisServerSchema), asyncHandler(redisServerController.testRaw));
router.get('/:id', redisServerController.get);
router.put('/:id', validateBody(redisServerSchema), redisServerController.update);
router.patch('/:id/enabled', validateBody(enabledSchema), redisServerController.setEnabled);
router.post('/:id/test', asyncHandler(redisServerController.test));
router.delete('/:id', redisServerController.remove);

export default router;
