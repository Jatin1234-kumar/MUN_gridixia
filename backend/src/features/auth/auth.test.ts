import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService, verifyAccess, verifyRefresh } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AppError } from '../../utils/AppError';

jest.mock('./auth.repository');
jest.mock('../../config', () => ({
  config: {
    jwt: { accessSecret: 'test_access_secret', refreshSecret: 'test_refresh_secret' },
    isProd: false,
  },
}));

const mockRepo = AuthRepository as jest.Mocked<typeof AuthRepository>;

const BASE_USER = {
  _id: { toString: () => 'user123' } as never,
  id: 'user123',
  email: 'test@example.com',
  role: 'delegate' as const,
  status: 'active' as const,
  refreshTokenVersion: 0,
  passwordHash: bcrypt.hashSync('Password1', 1),
};

beforeEach(() => jest.clearAllMocks());

// ── Register ──────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  it('creates user and returns tokens', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(BASE_USER as never);
    mockRepo.logAudit.mockResolvedValue(undefined as never);

    const result = await AuthService.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws 409 when email already exists', async () => {
    mockRepo.findByEmail.mockResolvedValue(BASE_USER as never);

    await expect(
      AuthService.register({ firstName: 'A', lastName: 'B', email: 'test@example.com', password: 'Password1' }),
    ).rejects.toThrow(new AppError(409, 'Email already in use'));
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  it('returns tokens on valid credentials', async () => {
    mockRepo.findByEmail.mockResolvedValue(BASE_USER as never);
    mockRepo.updateLastLogin.mockResolvedValue(undefined as never);
    mockRepo.findById.mockResolvedValue(BASE_USER as never);
    mockRepo.logAudit.mockResolvedValue(undefined as never);

    const result = await AuthService.login({ email: 'test@example.com', password: 'Password1' });

    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe('delegate');
  });

  it('throws 401 on wrong password', async () => {
    mockRepo.findByEmail.mockResolvedValue(BASE_USER as never);

    await expect(AuthService.login({ email: 'test@example.com', password: 'WrongPass1' })).rejects.toThrow(
      new AppError(401, 'Invalid credentials'),
    );
  });

  it('throws 401 when user not found', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    await expect(AuthService.login({ email: 'nobody@example.com', password: 'Password1' })).rejects.toThrow(
      new AppError(401, 'Invalid credentials'),
    );
  });

  it('throws 401 when user is suspended', async () => {
    mockRepo.findByEmail.mockResolvedValue({ ...BASE_USER, status: 'suspended' } as never);

    await expect(AuthService.login({ email: 'test@example.com', password: 'Password1' })).rejects.toThrow(
      new AppError(401, 'Invalid credentials'),
    );
  });
});

// ── Refresh ───────────────────────────────────────────────────────────────────

describe('AuthService.refresh', () => {
  it('rotates tokens when version matches', async () => {
    const payload = { sub: 'user123', role: 'delegate' as const, ver: 0 };
    const token = jwt.sign(payload, 'test_refresh_secret', { expiresIn: '7d' });
    mockRepo.findById.mockResolvedValue(BASE_USER as never);

    const result = await AuthService.refresh(token);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('throws 401 on version mismatch (revoked token)', async () => {
    const payload = { sub: 'user123', role: 'delegate' as const, ver: 0 };
    const token = jwt.sign(payload, 'test_refresh_secret', { expiresIn: '7d' });
    mockRepo.findById.mockResolvedValue({ ...BASE_USER, refreshTokenVersion: 1 } as never);

    await expect(AuthService.refresh(token)).rejects.toThrow(new AppError(401, 'Refresh token revoked'));
  });

  it('throws 401 on tampered token', async () => {
    await expect(AuthService.refresh('not.a.token')).rejects.toThrow(new AppError(401, 'Invalid refresh token'));
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('increments token version and logs audit', async () => {
    mockRepo.incrementRefreshTokenVersion.mockResolvedValue(BASE_USER as never);
    mockRepo.logAudit.mockResolvedValue(undefined as never);

    await AuthService.logout('user123');

    expect(mockRepo.incrementRefreshTokenVersion).toHaveBeenCalledWith('user123');
    expect(mockRepo.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'logout' }));
  });
});

// ── Token helpers ─────────────────────────────────────────────────────────────

describe('token helpers', () => {
  it('verifyAccess accepts valid access token', () => {
    const payload = { sub: 'u1', role: 'admin' as const, ver: 0 };
    const token = jwt.sign(payload, 'test_access_secret', { expiresIn: '15m' });
    const decoded = verifyAccess(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('admin');
  });

  it('verifyRefresh rejects access token on refresh secret', () => {
    const token = jwt.sign({ sub: 'u1' }, 'test_access_secret');
    expect(() => verifyRefresh(token)).toThrow();
  });
});
