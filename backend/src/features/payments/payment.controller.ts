import { Request } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AuthenticatedRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';
import { paymentService } from './payment.service';
import type { CreatePaymentOrderDto, VerifyPaymentDto } from './payment.validator';

function getClientMeta(req: Request) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export const paymentController = {
  createOrder: asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as CreatePaymentOrderDto;
    const result = await paymentService.createOrder({
      ...body,
      userId: authReq.user.sub,
      userRole: authReq.user.role,
      ...getClientMeta(req),
    });

    res.status(201).json({ data: result });
  }),

  verify: asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as VerifyPaymentDto;
    const result = await paymentService.verify({
      userId: authReq.user.sub,
      userRole: authReq.user.role,
      ...body,
      ...getClientMeta(req),
    });

    res.json({ data: result });
  }),

  getByOrderId: asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const result = await paymentService.getByOrderId(req.params.orderId, authReq.user.sub);
    res.json({ data: result });
  }),

  getPaidEventIds: asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const eventIds = await paymentService.getPaidEventIds(authReq.user.sub);
    res.json({ data: eventIds });
  }),

  webhook: asyncHandler(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(400, 'Webhook body must be raw JSON');
    }

    const result = await paymentService.handleWebhook(
      req.body,
      req.headers['x-razorpay-signature'] as string | undefined,
      req.headers['x-razorpay-event-id'] as string | undefined,
    );

    res.json(result);
  }),
};
