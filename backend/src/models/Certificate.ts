import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const certificateStatuses = ['draft', 'issued', 'revoked'] as const;
export type CertificateStatus = (typeof certificateStatuses)[number];

export interface Certificate extends SoftDeleteFields {
  registrationId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  certificateNumber: string;
  verificationCode: string;
  templateId?: string | null;
  status: CertificateStatus;
  issuedAt?: Date | null;
  issuedBy?: Types.ObjectId | null;
  revokedAt?: Date | null;
  fileUrl?: string | null;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<Certificate>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    certificateNumber: { type: String, required: true, trim: true, uppercase: true, minlength: 6, maxlength: 64 },
    verificationCode: { type: String, required: true, trim: true, minlength: 8, maxlength: 128 },
    templateId: { type: String, trim: true, maxlength: 100, default: null },
    status: { type: String, enum: certificateStatuses, default: 'draft', required: true },
    issuedAt: { type: Date, default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    revokedAt: { type: Date, default: null },
    fileUrl: { type: String, trim: true, maxlength: 2048, default: null },
    remarks: { type: String, trim: true, maxlength: 1000, default: null },
  },
  { optimisticConcurrency: true },
);

certificateSchema.index({ registrationId: 1 }, { unique: true, name: 'uniq_certificate_registration_active', partialFilterExpression: { deletedAt: null } });
certificateSchema.index({ certificateNumber: 1 }, { unique: true, name: 'uniq_certificate_number_active', partialFilterExpression: { deletedAt: null } });
certificateSchema.index({ verificationCode: 1 }, { unique: true, name: 'uniq_certificate_verification_code_active', partialFilterExpression: { deletedAt: null } });
certificateSchema.index({ eventId: 1, status: 1, issuedAt: -1 }, { name: 'certificate_event_status_issued_at_idx' });

applyCommonSchemaBehavior(certificateSchema);

export const CertificateModel = model<Certificate>('Certificate', certificateSchema);
export type CertificateDocument = HydratedDocument<Certificate>;
