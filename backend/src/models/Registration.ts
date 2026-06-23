import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const registrationStatuses = [
  'draft',
  'pending',
  'approved',
  'confirmed',
  'waitlisted',
  'cancelled',
  'rejected',
  'checked_in',
] as const;
export type RegistrationStatus = (typeof registrationStatuses)[number];

export const registrationPaymentStatuses = [
  'unpaid',
  'pending',
  'partially_paid',
  'paid',
  'refunded',
  'failed',
] as const;
export type RegistrationPaymentStatus = (typeof registrationPaymentStatuses)[number];

// ── State machine ─────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'rejected', 'waitlisted', 'cancelled'],
  approved: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  waitlisted: ['approved', 'cancelled'],
  cancelled: [],
  rejected: [],
  checked_in: [],
};

export function canTransition(from: RegistrationStatus, to: RegistrationStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export interface Registration extends SoftDeleteFields {
  registrationNumber: string;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  committeeId?: Types.ObjectId | null;
  status: RegistrationStatus;
  paymentStatus: RegistrationPaymentStatus;
  category?: string | null;
  notes?: string | null;
  submittedAt: Date;
  approvedAt?: Date | null;
  checkedInAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<Registration>(
  {
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 6,
      maxlength: 64,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    committeeId: { type: Schema.Types.ObjectId, ref: 'Committee', default: null, index: true },
    status: { type: String, enum: registrationStatuses, default: 'pending', required: true },
    paymentStatus: {
      type: String,
      enum: registrationPaymentStatuses,
      default: 'unpaid',
      required: true,
    },
    category: { type: String, trim: true, maxlength: 100, default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: null },
    submittedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    checkedInAt: { type: Date, default: null },
  },
  { optimisticConcurrency: true },
);

registrationSchema.index(
  { userId: 1, eventId: 1 },
  {
    unique: true,
    name: 'uniq_registration_user_event_active',
    partialFilterExpression: { deletedAt: null },
  },
);
registrationSchema.index(
  { registrationNumber: 1 },
  {
    unique: true,
    name: 'uniq_registration_number_active',
    partialFilterExpression: { deletedAt: null },
  },
);
registrationSchema.index(
  { eventId: 1, status: 1, submittedAt: -1 },
  { name: 'registration_event_status_submitted_at_idx' },
);
registrationSchema.index(
  { committeeId: 1, status: 1 },
  { name: 'registration_committee_status_idx' },
);
registrationSchema.index(
  { paymentStatus: 1, createdAt: -1 },
  { name: 'registration_payment_status_created_at_idx' },
);

applyCommonSchemaBehavior(registrationSchema);

export const RegistrationModel = model<Registration>('Registration', registrationSchema);
export type RegistrationDocument = HydratedDocument<Registration>;
