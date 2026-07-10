import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const eventTypes = ['MUN', 'YOUTH_PARLIAMENT'] as const;
export type EventType = (typeof eventTypes)[number];

export const eventStatuses = ['draft', 'pending', 'active', 'inactive', 'archived'] as const;
export type EventStatus = (typeof eventStatuses)[number];

export interface Event extends SoftDeleteFields {
  name: string;
  slug: string;
  description: string;
  type: EventType;
  status: EventStatus;
  startAt: Date;
  endAt: Date;
  location: string;
  timezone: string;
  capacity: number;
  baseFee: number;
  registrationOpensAt?: Date | null;
  registrationClosesAt?: Date | null;
  featuredImageUrl?: string | null;
  isPublic: boolean;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<Event>(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 220 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    type: { type: String, enum: eventTypes, required: true },
    status: { type: String, enum: eventStatuses, default: 'draft', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    location: { type: String, required: true, trim: true, minlength: 2, maxlength: 255 },
    timezone: { type: String, required: true, trim: true, minlength: 2, maxlength: 100, default: 'UTC' },
    capacity: { type: Number, required: true, min: 1, max: 100000 },
    baseFee: { type: Number, required: true, min: 0, default: 3500 },
    registrationOpensAt: { type: Date, default: null },
    registrationClosesAt: { type: Date, default: null },
    featuredImageUrl: { type: String, trim: true, maxlength: 2048, default: null },
    isPublic: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { optimisticConcurrency: true },
);

eventSchema.path('endAt').validate({
  validator(this: Event, value: Date) {
    return !(this.startAt instanceof Date) || value.getTime() > this.startAt.getTime();
  },
  message: 'endAt must be later than startAt',
});

eventSchema.path('registrationClosesAt').validate({
  validator(this: Event, value: Date | null) {
    if (value == null || this.registrationOpensAt == null) {
      return true;
    }

    return value.getTime() >= this.registrationOpensAt.getTime();
  },
  message: 'registrationClosesAt must be on or after registrationOpensAt',
});

eventSchema.index({ slug: 1 }, { unique: true, name: 'uniq_event_slug_active', partialFilterExpression: { deletedAt: null } });
eventSchema.index({ type: 1, status: 1, startAt: 1 }, { name: 'event_type_status_start_at_idx' });
eventSchema.index({ status: 1, startAt: -1 }, { name: 'event_status_start_at_idx' });
eventSchema.index({ createdBy: 1, createdAt: -1 }, { name: 'event_created_by_idx' });
eventSchema.index({ registrationOpensAt: 1, registrationClosesAt: 1 }, { name: 'event_registration_window_idx' });

applyCommonSchemaBehavior(eventSchema);

export const EventModel = model<Event>('Event', eventSchema);
export type EventDocument = HydratedDocument<Event>;

