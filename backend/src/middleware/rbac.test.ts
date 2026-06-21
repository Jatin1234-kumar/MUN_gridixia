import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  optionalAuthenticate,
  authorize,
  ownerOrRole,
  hasMinimumRole,
  type AuthenticatedRequest,
} from './authenticate';
import type { UserRole } from '../models/User';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../config', () => ({
  config: {
    jwt: { accessSecret: 'test_secret', refreshSecret: 'test_refresh' },
    isProd: false,
  },
}));

function makeToken(role: UserRole, sub = 'user-1'): string {
  return jwt.sign({ sub, role, ver: 0 }, 'test_secret', { expiresIn: '15m' });
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, params: {}, ...overrides } as Request;
}

const mockRes = {} as Response;

function mockNext(): jest.Mock<void, [unknown?]> {
  return jest.fn();
}

// ── hasMinimumRole ────────────────────────────────────────────────────────────

describe('hasMinimumRole', () => {
  const cases: [UserRole, UserRole, boolean][] = [
    ['super_admin', 'admin',     true],
    ['admin',       'admin',     true],
    ['admin',       'organizer', true],
    ['organizer',   'admin',     false],
    ['delegate',    'organizer', false],
    ['guest',       'guest',     true],
    ['guest',       'delegate',  false],
  ];

  test.each(cases)('%s satisfies %s → %s', (actual, required, expected) => {
    expect(hasMinimumRole(actual, required)).toBe(expected);
  });
});

// ── authenticate ──────────────────────────────────────────────────────────────

describe('authenticate', () => {
  it('attaches user payload for valid Bearer token', () => {
    const next = mockNext();
    const req = mockReq({ headers: { authorization: `Bearer ${makeToken('admin')}` } });
    authenticate(req, mockRes, next);
    expect((req as AuthenticatedRequest).user.role).toBe('admin');
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('calls next(AppError 401) when no Authorization header', () => {
    const next = mockNext();
    authenticate(mockReq(), mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number; message: string };
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/missing or invalid/i);
  });

  it('calls next(AppError 401) for malformed token', () => {
    const next = mockNext();
    const req = mockReq({ headers: { authorization: 'Bearer bad.token' } });
    authenticate(req, mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(401);
  });

  it('calls next(AppError 401) for expired token', () => {
    const expired = jwt.sign({ sub: 'u1', role: 'delegate', ver: 0 }, 'test_secret', { expiresIn: -1 });
    const next = mockNext();
    authenticate(mockReq({ headers: { authorization: `Bearer ${expired}` } }), mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(401);
  });

  it('calls next(AppError 401) when header lacks "Bearer " prefix', () => {
    const next = mockNext();
    const req = mockReq({ headers: { authorization: makeToken('admin') } });
    authenticate(req, mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(401);
  });
});

// ── optionalAuthenticate ──────────────────────────────────────────────────────

describe('optionalAuthenticate', () => {
  it('attaches user when valid token present', () => {
    const next = mockNext();
    const req = mockReq({ headers: { authorization: `Bearer ${makeToken('organizer')}` } });
    optionalAuthenticate(req, mockRes, next);
    expect((req as AuthenticatedRequest).user?.role).toBe('organizer');
    expect(next).toHaveBeenCalled();
  });

  it('still calls next without error when no token', () => {
    const next = mockNext();
    optionalAuthenticate(mockReq(), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('still calls next without error when token is invalid', () => {
    const next = mockNext();
    const req = mockReq({ headers: { authorization: 'Bearer garbage' } });
    optionalAuthenticate(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
    expect((req as AuthenticatedRequest).user).toBeUndefined();
  });
});

// ── authorize ─────────────────────────────────────────────────────────────────

describe('authorize', () => {
  function authedReq(role: UserRole, sub = 'user-1'): AuthenticatedRequest {
    const req = mockReq() as AuthenticatedRequest;
    req.user = { sub, role, ver: 0 };
    return req;
  }

  // Hierarchy checks
  it('allows admin to access admin-only route', () => {
    const next = mockNext();
    authorize(['admin'])(authedReq('admin'), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('allows super_admin to access admin-only route (hierarchy)', () => {
    const next = mockNext();
    authorize(['admin'])(authedReq('super_admin'), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('denies organizer on admin-only route', () => {
    const next = mockNext();
    authorize(['admin'])(authedReq('organizer'), mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number; message: string };
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/admin/i);
  });

  it('allows organizer on organizer route', () => {
    const next = mockNext();
    authorize(['organizer'])(authedReq('organizer'), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('denies delegate on organizer route', () => {
    const next = mockNext();
    authorize(['organizer'])(authedReq('delegate'), mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(403);
  });

  it('allows delegate on participant route', () => {
    const next = mockNext();
    authorize(['delegate'])(authedReq('delegate'), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  // Multi-role array
  it('allows access when user matches any listed role (hierarchy)', () => {
    const next = mockNext();
    authorize(['organizer', 'admin'])(authedReq('organizer'), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  // Exact mode
  it('exact mode: denies super_admin when only admin listed', () => {
    const next = mockNext();
    authorize(['admin'], { exact: true })(authedReq('super_admin'), mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(403);
  });

  it('exact mode: allows admin when admin listed', () => {
    const next = mockNext();
    authorize(['admin'], { exact: true })(authedReq('admin'), mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  // No user on request
  it('returns 401 when req.user is missing', () => {
    const next = mockNext();
    authorize(['admin'])(mockReq() as AuthenticatedRequest, mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(401);
  });

  // Guard against empty roles array
  it('throws at definition time when roles array is empty', () => {
    expect(() => authorize([])).toThrow('authorize() requires at least one role');
  });
});

// ── ownerOrRole ───────────────────────────────────────────────────────────────

describe('ownerOrRole', () => {
  function makeReq(role: UserRole, paramId: string, userId = 'user-1'): AuthenticatedRequest {
    const req = mockReq({ params: { id: paramId } }) as AuthenticatedRequest;
    req.user = { sub: userId, role, ver: 0 };
    return req;
  }

  it('allows owner regardless of role', () => {
    const next = mockNext();
    const req = makeReq('delegate', 'user-1', 'user-1');
    ownerOrRole((r) => r.params.id, ['admin'])(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('allows non-owner with sufficient role', () => {
    const next = mockNext();
    const req = makeReq('admin', 'user-2', 'user-1');
    ownerOrRole((r) => r.params.id, ['admin'])(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(/* nothing */);
  });

  it('denies non-owner with insufficient role', () => {
    const next = mockNext();
    const req = makeReq('delegate', 'user-2', 'user-1');
    ownerOrRole((r) => r.params.id, ['admin'])(req, mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number; message: string };
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/do not own/i);
  });

  it('returns 401 when no user attached', () => {
    const next = mockNext();
    ownerOrRole((r) => r.params.id, ['admin'])(mockReq({ params: { id: 'x' } }) as AuthenticatedRequest, mockRes, next);
    const err = next.mock.calls[0][0] as { statusCode: number };
    expect(err.statusCode).toBe(401);
  });
});
