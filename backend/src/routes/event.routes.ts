import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { validate } from '../middleware/validate';
import {
  createEventSchema,
  updateEventSchema,
  getEventSchema,
} from '../validators/event.validator';

const router = Router();

router.get('/', eventController.getAll);
router.get('/:id', validate(getEventSchema), eventController.getById);
router.post('/', validate(createEventSchema), eventController.create);
router.patch('/:id', validate(updateEventSchema), eventController.update);
router.delete('/:id', validate(getEventSchema), eventController.delete);

export default router;
