import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { paymentController } from './payment.controller';
import { createPaymentOrderSchema, verifyPaymentSchema } from './payment.validator';

const router = Router();

router.post('/webhook', paymentController.webhook);
router.post('/orders', authenticate, validate(createPaymentOrderSchema), paymentController.createOrder);
router.post('/verify', authenticate, validate(verifyPaymentSchema), paymentController.verify);
router.get('/paid-event-ids', authenticate, paymentController.getPaidEventIds);
router.get('/:orderId', authenticate, paymentController.getByOrderId);

export default router;
