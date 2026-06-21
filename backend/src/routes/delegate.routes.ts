import { Router } from 'express';
import { delegateController } from '../controllers/delegate.controller';
import { validate } from '../middleware/validate';
import { createDelegateSchema, updateDelegateSchema, getDelegateSchema } from '../validators/delegate.validator';

const router = Router();

router.get('/',    delegateController.getAll);
router.get('/:id', validate(getDelegateSchema),    delegateController.getById);
router.post('/',   validate(createDelegateSchema),  delegateController.create);
router.patch('/:id', validate(updateDelegateSchema), delegateController.update);
router.delete('/:id', validate(getDelegateSchema),  delegateController.delete);

export default router;
