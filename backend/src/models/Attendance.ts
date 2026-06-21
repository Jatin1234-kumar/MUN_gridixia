import { model, Schema, type HydratedDocument, Types } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const attendanceStatuses = ['present', 'absent', 'late', 'excused', 'unmarked'] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export interface Attendance extends SoftDeleteFields {
  registrationId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  committeeId?: Types.ObjectId | null;
  status: AttendanceStatus;
  markedBy?: Types.ObjectId | null;
  markedAt: Date;
  sessionCode?: string | null;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<Attendance>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    committeeId: { type: Schema.Types.ObjectId, ref: 'Committee', default: null, index: true },
    status: { type: String, enum: attendanceStatuses, default: 'unmarked', required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    markedAt: { type: Date, default: Date.now },
    sessionCode: { type: String, trim: true, maxlength: 100, default: null },
    remarks: { type: String, trim: true, maxlength: 1000, default: null },
  },
  { optimisticConcurrency: true },
);

attendanceSchema.index({ registrationId: 1 }, { unique: true, name: 'uniq_attendance_registration_active', partialFilterExpression: { deletedAt: null } });
attendanceSchema.index({ eventId: 1, status: 1, markedAt: -1 }, { name: 'attendance_event_status_marked_at_idx' });
attendanceSchema.index({ userId: 1, eventId: 1, markedAt: -1 }, { name: 'attendance_user_event_marked_at_idx' });
attendanceSchema.index({ committeeId: 1, status: 1, markedAt: -1 }, { name: 'attendance_committee_status_marked_at_idx' });

applyCommonSchemaBehavior(attendanceSchema);

export const AttendanceModel = model<Attendance>('Attendance', attendanceSchema);
export type AttendanceDocument = HydratedDocument<Attendance>;
