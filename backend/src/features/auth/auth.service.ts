import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';
import { AuthRepository } from './auth.repository';
import type { UserRole } from '../../models/User';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 12;

export interface TokenPayload {
  sub: string;
  role: UserRole;
  ver: number;
}

function signAccess(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: ACCESS_TTL });
}

function signRefresh(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: REFRESH_TTL });
}

export function verifyAccess(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

export function verifyRefresh(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'strict' as const,
  maxAge: REFRESH_TTL_MS,
  path: '/api/auth',
};

export const AuthService = {
  // Public registration — always creates a delegate
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const existing = await AuthRepository.findByEmail(data.email);
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    let user;
    try {
      user = await AuthRepository.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        role: 'delegate',
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new AppError(409, 'Email already in use');
      }
      throw err;
    }

    await AuthRepository.logAudit({
      actorId: user._id,
      actorRole: user.role,
      entityId: user.id as string,
      action: 'create',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    const payload: TokenPayload = {
      sub: user.id as string,
      role: user.role,
      ver: user.refreshTokenVersion,
    };
    return {
      accessToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      user: { id: user.id as string, email: user.email, role: user.role },
    };
  },

  // Admin-only: create a user with an elevated role (admin or organizer)
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'admin' | 'organizer';
    actorRole: UserRole;
    actorId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Only super_admin can create admins; admin and super_admin can create organizers
    if (data.role === 'admin' && data.actorRole !== 'super_admin') {
      throw new AppError(403, 'Only super_admin can create admin accounts');
    }
    if (data.role === 'organizer' && data.actorRole !== 'super_admin' && data.actorRole !== 'admin') {
      throw new AppError(403, 'Only admin or super_admin can create organizer accounts');
    }

    const existing = await AuthRepository.findByEmail(data.email);
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    let user;
    try {
      user = await AuthRepository.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        role: data.role,
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new AppError(409, 'Email already in use');
      }
      throw err;
    }

    await AuthRepository.logAudit({
      actorId: user._id,
      actorRole: data.actorRole,
      entityId: user.id as string,
      action: 'create',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return { id: user.id as string, email: user.email, role: user.role };
  },

  async login(data: { email: string; password: string; ipAddress?: string; userAgent?: string }) {
    const user = await AuthRepository.findByEmail(data.email);
    if (!user || user.status === 'suspended') throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    await AuthRepository.updateLastLogin(user._id);
    await AuthRepository.logAudit({
      actorId: user._id,
      actorRole: user.role,
      entityId: user.id as string,
      action: 'login',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    const payload: TokenPayload = {
      sub: user.id as string,
      role: user.role,
      ver: user.refreshTokenVersion,
    };
    return {
      accessToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      user: { id: user.id as string, email: user.email, role: user.role },
    };
  },

  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = verifyRefresh(refreshToken);
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }

    const user = await AuthRepository.findById(payload.sub);
    if (!user || user.status === 'suspended') throw new AppError(401, 'Invalid refresh token');
    if (user.refreshTokenVersion !== payload.ver) throw new AppError(401, 'Refresh token revoked');

    const updated = await AuthRepository.incrementRefreshTokenVersion(payload.sub);
    const ver = updated?.refreshTokenVersion ?? user.refreshTokenVersion + 1;

    const newPayload: TokenPayload = { sub: user.id as string, role: user.role, ver };
    return {
      accessToken: signAccess(newPayload),
      refreshToken: signRefresh(newPayload),
      user: { id: user.id as string, email: user.email, role: user.role },
    };
  },

  async requestRoleUpgrade(userId: string, requestedRole: 'organizer' | 'admin', currentRole: UserRole, reason?: string) {
    // delegate can request organizer; organizer can request admin
    if (requestedRole === 'organizer' && currentRole !== 'delegate') {
      throw new AppError(400, 'Only delegates can request organizer role');
    }
    if (requestedRole === 'admin' && currentRole !== 'organizer') {
      throw new AppError(400, 'Only organizers can request admin role');
    }

    const existing = await AuthRepository.findPendingRoleRequest(userId, requestedRole);
    if (existing) throw new AppError(409, 'You already have a pending request for this role');

    const request = await AuthRepository.createRoleRequest(userId, requestedRole, reason);
    return request;
  },

  async reviewRoleRequest(
    requestId: string,
    action: 'approved' | 'rejected',
    reviewerRole: UserRole,
    reviewerId: string,
  ) {
    const request = await AuthRepository.findRoleRequestById(requestId);
    if (!request) throw new AppError(404, 'Role request not found');
    if (request.status !== 'pending') throw new AppError(400, 'Request already reviewed');

    // organizer requests can be approved by admin or super_admin
    // admin requests can only be approved by super_admin
    if (request.requestedRole === 'admin' && reviewerRole !== 'super_admin') {
      throw new AppError(403, 'Only super_admin can approve admin role requests');
    }
    if (request.requestedRole === 'organizer' && reviewerRole !== 'admin' && reviewerRole !== 'super_admin') {
      throw new AppError(403, 'Only admin or super_admin can approve organizer role requests');
    }

    await AuthRepository.updateRoleRequestStatus(requestId, action, reviewerId);

    if (action === 'approved') {
      const userId = request.userId.toString();
      await AuthRepository.updateUserRole(userId, request.requestedRole);
    }

    return { requestId, action };
  },

  async listRoleRequests(filter: { status?: string; requestedRole?: string } = {}, viewerRole?: UserRole) {
    // admin can only see organizer requests; super_admin sees all
    if (viewerRole === 'admin') {
      filter = { ...filter, requestedRole: 'organizer' };
    }
    return AuthRepository.listRoleRequests(filter);
  },

  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await AuthRepository.incrementRefreshTokenVersion(userId);
    if (user) {
      await AuthRepository.logAudit({
        actorId: user._id,
        actorRole: user.role,
        entityId: user.id as string,
        action: 'logout',
        ipAddress,
        userAgent,
      });
    }
  },
};
