import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const auditActions = ['create', 'update', 'delete', 'soft_delete', 'restore', 'login', 'logout', 'issue', 'approve', 'pay', 'refund', 'check_in', 'generate_certificate', 'verify_certificate'] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditEntityTypes = ['User', 'Event', 'Committee', 'Registration', 'Payment', 'Ticket', 'Attendance', 'Certificate', 'AuditLog'] as const;
export type AuditEntityType = (typeof auditEntityTypes)[number];

export interface AuditLog extends SoftDeleteFields {
  actorId?: Types.ObjectId | null;
  actorRole?: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorRole: { type: String, trim: true, maxlength: 50, default: null },
    entityType: { type: String, enum: auditEntityTypes, required: true, index: true },
    entityId: { type: String, required: true, trim: true, maxlength: 128 },
    action: { type: String, enum: auditActions, required: true, index: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true, maxlength: 100, default: null },
    userAgent: { type: String, trim: true, maxlength: 512, default: null },
    requestId: { type: String, trim: true, maxlength: 128, default: null },
  },
  { optimisticConcurrency: true },
);

auditLogSchema.index({ actorId: 1, createdAt: -1 }, { name: 'audit_log_actor_created_at_idx' });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 }, { name: 'audit_log_entity_created_at_idx' });
auditLogSchema.index({ action: 1, createdAt: -1 }, { name: 'audit_log_action_created_at_idx' });
auditLogSchema.index({ createdAt: -1 }, { name: 'audit_log_created_at_idx' });

applyCommonSchemaBehavior(auditLogSchema);

export const AuditLogModel = model<AuditLog>('AuditLog', auditLogSchema);
export type AuditLogDocument = HydratedDocument<AuditLog>;
