/// <reference types="jest" />
import crypto from 'crypto';
import { verifyCheckoutSignature, verifyWebhookSignature } from './razorpay.client';

jest.mock('../../config', () => ({
  config: {
    razorpay: {
      keyId: 'rzp_test_key',
      secret: 'test_razorpay_secret',
      webhookSecret: 'test_webhook_secret',
    },
  },
}));

describe('razorpay signature verification', () => {
  it('accepts a valid checkout signature', () => {
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    const signature = crypto
      .createHmac('sha256', 'test_razorpay_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(verifyCheckoutSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it('rejects an invalid checkout signature', () => {
    expect(
      verifyCheckoutSignature({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'bad_signature',
      }),
    ).toBe(false);
  });

  it('accepts a valid webhook signature over the raw body', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto
      .createHmac('sha256', 'test_webhook_secret')
      .update(rawBody)
      .digest('hex');

    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
  });
});
