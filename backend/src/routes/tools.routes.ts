import { Router } from 'express';
import { toolController } from '../controllers/tool.controller.js';
import { validateBody } from '../middlewares/validate.js';
import { toolSchema, toolReorderSchema } from '../schemas/index.js';

const router = Router();

router.get('/', toolController.list);
router.post('/', validateBody(toolSchema), toolController.create);
// Antes de '/:id' para não ser interpretado como um id.
router.put('/reorder', validateBody(toolReorderSchema), toolController.reorder);
router.get('/:id', toolController.get);
router.put('/:id', validateBody(toolSchema), toolController.update);
router.delete('/:id', toolController.remove);

export default router;
