import { Router } from 'express';
import { delegateController } from '../controllers/delegate.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/authenticate';
import {
  createDelegateSchema,
  updateDelegateSchema,
  getDelegateSchema,
} from '../validators/delegate.validator';

const router = Router();

router.get('/pass', authenticate, delegateController.getMyPass);
router.get('/', delegateController.getAll);
router.get('/:id', validate(getDelegateSchema), delegateController.getById);
router.post(
  '/',
  authenticate,
  authorize(['organizer']),
  validate(createDelegateSchema),
  delegateController.create,
);
router.patch(
  '/:id',
  authenticate,
  authorize(['organizer']),
  validate(updateDelegateSchema),
  delegateController.update,
);
router.delete(
  '/:id',
  authenticate,
  authorize(['organizer']),
  validate(getDelegateSchema),
  delegateController.delete,
);

export default router;
