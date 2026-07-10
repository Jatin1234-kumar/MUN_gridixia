import { Router } from 'express';
import { committeeController } from '../controllers/committee.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/authenticate';
import {
  createCommitteeSchema,
  updateCommitteeSchema,
  committeeParamSchema,
  getByEventSchema,
} from '../validators/committee.validator';

const router = Router();

// Public reads
router.get('/', committeeController.getAll);
router.get('/event/:eventId', validate(getByEventSchema),   committeeController.getByEventId);
router.get('/:id',            validate(committeeParamSchema), committeeController.getById);

// Protected mutations
router.post(
  '/',
  authenticate, authorize(['organizer']),
  validate(createCommitteeSchema),
  committeeController.create,
);

router.patch(
  '/:id',
  authenticate, authorize(['organizer']),
  validate(updateCommitteeSchema),
  committeeController.update,
);

router.delete(
  '/:id',
  authenticate, authorize(['organizer']),
  validate(committeeParamSchema),
  committeeController.delete,
);

export default router;
