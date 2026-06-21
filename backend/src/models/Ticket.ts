import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const ticketStatuses = ['issued', 'active', 'used', 'cancelled', 'revoked'] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export interface Ticket extends SoftDeleteFields {
  registrationId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketNumber: string;
  qrCode: string;
  status: TicketStatus;
  issuedAt: Date;
  validFrom?: Date | null;
  validUntil?: Date | null;
  checkedInAt?: Date | null;
  gate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<Ticket>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ticketNumber: { type: String, required: true, trim: true, uppercase: true, minlength: 6, maxlength: 64 },
    qrCode: { type: String, required: true, trim: true, minlength: 8, maxlength: 512 },
    status: { type: String, enum: ticketStatuses, default: 'issued', required: true },
    issuedAt: { type: Date, default: Date.now },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    checkedInAt: { type: Date, default: null },
    gate: { type: String, trim: true, maxlength: 100, default: null },
  },
  { optimisticConcurrency: true },
);

ticketSchema.index({ registrationId: 1 }, { unique: true, name: 'uniq_ticket_registration_active', partialFilterExpression: { deletedAt: null } });
ticketSchema.index({ ticketNumber: 1 }, { unique: true, name: 'uniq_ticket_number_active', partialFilterExpression: { deletedAt: null } });
ticketSchema.index({ qrCode: 1 }, { unique: true, name: 'uniq_ticket_qr_code_active', partialFilterExpression: { deletedAt: null } });
ticketSchema.index({ eventId: 1, status: 1, issuedAt: -1 }, { name: 'ticket_event_status_issued_at_idx' });

applyCommonSchemaBehavior(ticketSchema);

export const TicketModel = model<Ticket>('Ticket', ticketSchema);
export type TicketDocument = HydratedDocument<Ticket>;
