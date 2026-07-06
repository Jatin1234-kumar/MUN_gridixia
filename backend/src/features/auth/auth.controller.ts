import { Request } from 'express';
import { AuthService, REFRESH_COOKIE_OPTIONS } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AuthenticatedRequest } from '../../middleware/authenticate';

const COOKIE_NAME = 'refresh_token';

function getClientMeta(req: Request) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export const register = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const result = await AuthService.register({ ...body, ...getClientMeta(req) } as Parameters<typeof AuthService.register>[0]);
  res.cookie(COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ accessToken: result.accessToken, user: result.user });
});

export const login = asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const result = await AuthService.login({ ...body, ...getClientMeta(req) } as Parameters<typeof AuthService.login>[0]);
  res.cookie(COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken: result.accessToken, user: result.user });
});

export const refresh = asyncHandler(async (req, res) => {
  const token: string | undefined = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ message: 'Missing refresh token' });
    return;
  }
  const result = await AuthService.refresh(token);
  res.cookie(COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken: result.accessToken, user: result.user });
});

export const logout = asyncHandler(async (req, res) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  const userId = (req as AuthenticatedRequest).user?.sub;
  if (userId) await AuthService.logout(userId, ipAddress, userAgent);
  res.clearCookie(COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
  res.status(204).send();
});

export const createUser = asyncHandler(async (req, res) => {
  const actor = (req as AuthenticatedRequest).user;
  const body = req.body as Record<string, unknown>;
  const user = await AuthService.createUser({
    firstName: body.firstName as string,
    lastName: body.lastName as string,
    email: body.email as string,
    password: body.password as string,
    role: body.role as 'admin' | 'organizer',
    actorRole: actor.role,
    actorId: actor.sub,
    ...getClientMeta(req),
  });
  res.status(201).json({ data: user });
});
