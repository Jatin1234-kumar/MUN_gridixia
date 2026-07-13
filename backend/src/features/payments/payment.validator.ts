import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  body: z.object({
    committeeId: z.string().min(1),
    applicantName: z.string().min(2).max(120),
    email: z.string().email(),
    paymentMethod: z.enum(['card', 'upi', 'netbanking']),
    billingName: z.string().min(2).max(120),
    couponCode: z.string().max(64).optional().default(''),
    applicationDraft: z.record(z.unknown()).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

export type CreatePaymentOrderDto = z.infer<typeof createPaymentOrderSchema>['body'];
export type VerifyPaymentDto = z.infer<typeof verifyPaymentSchema>['body'];
