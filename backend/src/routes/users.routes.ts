import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { userCreateSchema, userUpdateSchema, accessSchema } from '../schemas/index.js';

const router = Router();

// Toda a gestão de usuários é restrita a administradores.
router.use(requireAuth, requireAdmin);

router.get('/', userController.list);
router.post('/', validateBody(userCreateSchema), userController.create);
router.get('/:id', userController.get);
router.put('/:id', validateBody(userUpdateSchema), userController.update);
router.delete('/:id', userController.remove);
router.get('/:id/access', userController.getAccess);
router.put('/:id/access', validateBody(accessSchema), userController.setAccess);

export default router;
