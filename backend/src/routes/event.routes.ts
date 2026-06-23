import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/authenticate';
import {
  createEventSchema,
  updateEventSchema,
  getEventSchema,
} from '../validators/event.validator';

const router = Router();

router.get('/', eventController.getAll);
router.get('/:id', validate(getEventSchema), eventController.getById);
router.post(
  '/',
  authenticate,
  authorize(['organizer']),
  validate(createEventSchema),
  eventController.create,
);
router.patch(
  '/:id',
  authenticate,
  authorize(['organizer']),
  validate(updateEventSchema),
  eventController.update,
);
router.delete(
  '/:id',
  authenticate,
  authorize(['organizer']),
  validate(getEventSchema),
  eventController.delete,
);

export default router;
