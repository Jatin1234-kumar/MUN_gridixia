import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccess, type TokenPayload } from '../features/auth/auth.service';
import { AppError } from '../utils/AppError';
import type { UserRole } from '../models/User';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

// ── Role hierarchy ────────────────────────────────────────────────────────────
// Higher value = more privileged. A role satisfies a requirement if its
// hierarchy value is >= the required role's value.

const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest:       0,
  delegate:    1, // "participant" in the domain language
  staff:       2,
  organizer:   3,
  admin:       4,
  super_admin: 5,
};

/**
 * Returns true when `actual` meets or exceeds the privilege level of `required`.
 * e.g. hasMinimumRole('admin', 'organizer') → true
 */
export function hasMinimumRole(actual: UserRole, required: UserRole): boolean {
  return (ROLE_HIERARCHY[actual] ?? -1) >= (ROLE_HIERARCHY[required] ?? Infinity);
}

// ── Core middleware ───────────────────────────────────────────────────────────

/** Verifies Bearer token and attaches `req.user`. Must precede authorize(). */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid authorization header'));
  }
  try {
    (req as AuthenticatedRequest).user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token'));
  }
}

/** Same as authenticate but never rejects — downstream handlers check req.user. */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      (req as AuthenticatedRequest).user = verifyAccess(header.slice(7));
    } catch {
      /* intentionally silent */
    }
  }
  next();
}

// ── authorize() ───────────────────────────────────────────────────────────────

export interface AuthorizeOptions {
  /**
   * When true, the minimum-role check is replaced by a strict membership check:
   * the user's role must be in the `roles` array exactly.
   * Default: false (hierarchy check — any role >= the lowest listed role passes).
   */
  exact?: boolean;
}

/**
 * authorize(["admin"])            — role must be admin or higher
 * authorize(["organizer"])        — role must be organizer or higher
 * authorize(["admin"], { exact: true }) — role must be exactly admin (or super_admin still included for safety)
 *
 * Always compose after authenticate():
 *   router.get('/secret', authenticate, authorize(['admin']), handler)
 */
export function authorize(roles: UserRole[], options: AuthorizeOptions = {}): RequestHandler {
  if (roles.length === 0) throw new Error('authorize() requires at least one role');

  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const permitted = options.exact
      ? roles.includes(user.role)
      : roles.some((required) => hasMinimumRole(user.role, required));

    if (!permitted) {
      return next(
        new AppError(403, `Access denied. Required role(s): ${roles.join(', ')}`),
      );
    }

    next();
  };
}

// ── Ownership guard ───────────────────────────────────────────────────────────

/**
 * Allows access if the authenticated user owns the resource OR meets the
 * minimum role threshold. Ownership is determined by comparing req.user.sub
 * against the value returned by `getOwnerId(req)`.
 *
 * Example — allow user to edit their own profile, or any admin:
 *   router.patch('/users/:id', authenticate, ownerOrRole((req) => req.params.id, ['admin']), handler)
 */
export function ownerOrRole(
  getOwnerId: (req: Request) => string | undefined,
  roles: UserRole[],
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const isOwner = getOwnerId(req) === user.sub;
    const hasRole = roles.some((required) => hasMinimumRole(user.role, required));

    if (!isOwner && !hasRole) {
      return next(new AppError(403, 'Access denied. You do not own this resource'));
    }

    next();
  };
}

// ── Legacy alias (backwards-compat with existing routes) ─────────────────────

/** @deprecated Use authorize([role]) instead */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return authorize(roles);
}
