import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';
import type { RazorpayOrder } from './payment.types';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

function authHeader(): string {
  const token = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.secret}`).toString('base64');
  return `Basic ${token}`;
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency: 'INR';
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1,
    }),
  });

  const body = await response.json().catch(() => undefined) as
    | { error?: { description?: string } }
    | RazorpayOrder
    | undefined;

  if (!response.ok) {
    const message =
      body && 'error' in body && body.error?.description
        ? body.error.description
        : 'Unable to create Razorpay order';
    throw new AppError(response.status >= 500 ? 502 : 400, message);
  }

  return body as RazorpayOrder;
}

export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac('sha256', config.razorpay.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');

  return timingSafeEqual(expected, input.signature);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
