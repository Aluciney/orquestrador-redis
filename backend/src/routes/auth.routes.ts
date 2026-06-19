import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { loginSchema, changePasswordSchema } from '../schemas/index.js';

const router = Router();

// Públicas (não exigem sessão)
router.post('/login', validateBody(loginSchema), asyncHandler(authController.login));
router.get('/me', authController.me);
router.post('/logout', authController.logout);

// Exige sessão
router.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

export default router;
