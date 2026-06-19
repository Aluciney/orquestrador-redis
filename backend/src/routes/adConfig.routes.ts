import { Router } from 'express';
import { adConfigController } from '../controllers/adConfig.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validateBody } from '../middlewares/validate.js';
import { adConfigSchema, adTestSchema } from '../schemas/index.js';

const router = Router();

// Configuração de AD é restrita a administradores.
router.use(requireAuth, requireAdmin);

router.get('/', adConfigController.get);
router.put('/', validateBody(adConfigSchema), adConfigController.update);
router.post('/test', validateBody(adTestSchema), asyncHandler(adConfigController.test));

export default router;
