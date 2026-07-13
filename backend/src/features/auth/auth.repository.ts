import { Types } from 'mongoose';
import { UserModel, type UserDocument } from '../../models/User';
import { AuditLogModel } from '../../models/AuditLog';
import { RoleRequestModel, type RoleRequestTarget } from '../../models/RoleRequest';

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
    return UserModel.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true }).exec();
  },

  createRoleRequest(userId: string | Types.ObjectId, requestedRole: RoleRequestTarget, reason?: string) {
    return RoleRequestModel.create({ userId, requestedRole, reason });
  },

  findPendingRoleRequest(userId: string | Types.ObjectId, requestedRole: RoleRequestTarget) {
    return RoleRequestModel.findOne({ userId, requestedRole, status: 'pending' }).exec();
  },

  listRoleRequests(filter: { status?: string; requestedRole?: string } = {}) {
    const query: Record<string, string> = {};
    if (filter.status) query.status = filter.status;
    if (filter.requestedRole) query.requestedRole = filter.requestedRole;
    return RoleRequestModel.find(query).populate('userId', 'firstName lastName email role').sort({ createdAt: -1 }).exec();
  },

  findRoleRequestById(id: string | Types.ObjectId) {
    return RoleRequestModel.findById(id).exec();
  },

  updateRoleRequestStatus(
    id: string | Types.ObjectId,
    status: 'approved' | 'rejected',
    reviewedBy: string | Types.ObjectId,
  ) {
    return RoleRequestModel.findByIdAndUpdate(
      id,
      { status, reviewedBy, reviewedAt: new Date() },
      { new: true },
    ).exec();
  },

  updateUserRole(userId: string | Types.ObjectId, role: RoleRequestTarget) {
    return UserModel.findByIdAndUpdate(userId, { role }, { new: true }).exec();
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
