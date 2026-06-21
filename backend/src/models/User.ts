import { model, Schema, type HydratedDocument } from 'mongoose';
import { applyCommonSchemaBehavior, type SoftDeleteFields } from './shared';

export const userRoles = ['super_admin', 'admin', 'organizer', 'staff', 'delegate', 'guest'] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ['active', 'invited', 'inactive', 'suspended'] as const;
export type UserStatus = (typeof userStatuses)[number];

export interface User extends SoftDeleteFields {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  refreshTokenVersion: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, minlength: 60, select: false },
    role: { type: String, enum: userRoles, default: 'guest', required: true },
    status: { type: String, enum: userStatuses, default: 'active', required: true },
    phoneNumber: { type: String, trim: true, maxlength: 20, default: null },
    avatarUrl: { type: String, trim: true, maxlength: 2048, default: null },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    refreshTokenVersion: { type: Number, default: 0, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { optimisticConcurrency: true },
);

userSchema.path('email').validate({
  validator: (value: string) => /^\S+@\S+\.\S+$/.test(value),
  message: 'email must be a valid email address',
});

userSchema.index({ email: 1 }, { unique: true, name: 'uniq_user_email_active', partialFilterExpression: { deletedAt: null } });
userSchema.index({ role: 1, status: 1, deletedAt: 1 }, { name: 'user_role_status_idx' });
userSchema.index({ status: 1, createdAt: -1 }, { name: 'user_status_created_at_idx' });
userSchema.index({ lastLoginAt: -1 }, { name: 'user_last_login_at_idx' });

applyCommonSchemaBehavior(userSchema);

export const UserModel = model<User>('User', userSchema);
export type UserDocument = HydratedDocument<User>;
