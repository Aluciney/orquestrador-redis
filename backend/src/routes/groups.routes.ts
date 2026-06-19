import { Router } from 'express';
import { groupController } from '../controllers/group.controller.js';
import { validateBody } from '../middlewares/validate.js';
import { groupSchema } from '../schemas/index.js';

const router = Router();

router.get('/', groupController.list);
router.post('/', validateBody(groupSchema), groupController.create);
router.get('/:id', groupController.get);
router.put('/:id', validateBody(groupSchema), groupController.update);
router.delete('/:id', groupController.remove);

export default router;
