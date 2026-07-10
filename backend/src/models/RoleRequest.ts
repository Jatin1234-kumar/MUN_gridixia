import { model, Schema, type HydratedDocument } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const roleRequestStatuses = ['pending', 'approved', 'rejected'] as const;
export type RoleRequestStatus = (typeof roleRequestStatuses)[number];

export const roleRequestTargets = ['organizer', 'admin'] as const;
export type RoleRequestTarget = (typeof roleRequestTargets)[number];

export interface RoleRequest extends SoftDeleteFields {
  userId: Schema.Types.ObjectId;
  requestedRole: RoleRequestTarget;
  status: RoleRequestStatus;
  reason?: string | null;
  reviewedBy?: Schema.Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const roleRequestSchema = new Schema<RoleRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedRole: { type: String, enum: roleRequestTargets, required: true },
    status: { type: String, enum: roleRequestStatuses, default: 'pending', required: true },
    reason: { type: String, trim: true, maxlength: 500, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { optimisticConcurrency: true },
);

roleRequestSchema.index({ userId: 1, requestedRole: 1, status: 1 }, { name: 'role_request_user_idx' });
roleRequestSchema.index({ status: 1, createdAt: -1 }, { name: 'role_request_status_idx' });

applyCommonSchemaBehavior(roleRequestSchema);

export const RoleRequestModel = model<RoleRequest>('RoleRequest', roleRequestSchema);
export type RoleRequestDocument = HydratedDocument<RoleRequest>;
