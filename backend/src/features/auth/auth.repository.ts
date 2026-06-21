import { Types } from 'mongoose';
import { UserModel, type UserDocument } from '../../models/User';
import { AuditLogModel } from '../../models/AuditLog';

export const AuthRepository = {
  findByEmail(email: string) {
    return UserModel.findOne({ email }).select('+passwordHash').exec();
  },

  findById(id: string | Types.ObjectId) {
    return UserModel.findById(id).exec();
  },

  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role?: UserDocument['role'];
  }) {
    return UserModel.create(data);
  },

  incrementRefreshTokenVersion(id: string | Types.ObjectId) {
    return UserModel.findByIdAndUpdate(id, { $inc: { refreshTokenVersion: 1 } }, { new: true }).exec();
  },

  updateLastLogin(id: string | Types.ObjectId) {
    return UserModel.findByIdAndUpdate(id, { lastLoginAt: new Date() }).exec();
  },

  logAudit(data: {
    actorId?: Types.ObjectId | null;
    actorRole?: string;
    entityId: string;
    action: 'login' | 'logout' | 'create';
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return AuditLogModel.create({ ...data, entityType: 'User' });
  },
};
