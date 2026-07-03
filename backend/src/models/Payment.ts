import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const paymentProviders = ['razorpay', 'cash', 'bank_transfer', 'manual'] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentStatuses = [
  'created',
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'cancelled',
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export interface Payment extends SoftDeleteFields {
  registrationId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  receipt: string;
  orderId?: string | null;
  paymentId?: string | null;
  signature?: string | null;
  refundedAmount?: number | null;
  attemptNumber: number;
  paidAt?: Date | null;
  refundedAt?: Date | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<Payment>(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    provider: { type: String, enum: paymentProviders, default: 'razorpay', required: true },
    status: { type: String, enum: paymentStatuses, default: 'created', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: 'INR',
    },
    receipt: { type: String, required: true, trim: true, minlength: 1, maxlength: 128 },
    orderId: { type: String, trim: true, maxlength: 128, default: null },
    paymentId: { type: String, trim: true, maxlength: 128, default: null },
    signature: { type: String, trim: true, maxlength: 512, default: null },
    refundedAmount: { type: Number, min: 0, default: null },
    attemptNumber: { type: Number, default: 1, min: 1 },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, maxlength: 1000, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { optimisticConcurrency: true },
);

paymentSchema.index(
  { registrationId: 1, createdAt: -1 },
  { name: 'payment_registration_created_at_idx' },
);
paymentSchema.index(
  { eventId: 1, status: 1, createdAt: -1 },
  { name: 'payment_event_status_created_at_idx' },
);
paymentSchema.index({ status: 1, paidAt: -1 }, { name: 'payment_status_paid_at_idx' });
paymentSchema.index(
  { orderId: 1 },
  {
    unique: true,
    name: 'uniq_payment_order_id_active',
    partialFilterExpression: { deletedAt: null, orderId: { $type: 'string' } },
  },
);
paymentSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    name: 'uniq_payment_payment_id_active',
    partialFilterExpression: { deletedAt: null, paymentId: { $type: 'string' } },
  },
);

paymentSchema.path('refundedAmount').validate({
  validator(this: Payment, value: number | null) {
    if (value == null) return true;
    return value <= this.amount;
  },
  message: 'refundedAmount cannot exceed amount',
});

applyCommonSchemaBehavior(paymentSchema);

export const PaymentModel = model<Payment>('Payment', paymentSchema);
export type PaymentDocument = HydratedDocument<Payment>;
