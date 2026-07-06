import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/authenticate';
import { register, login, refresh, logout, createUser } from './auth.controller';
import { registerSchema, loginSchema, createUserSchema } from './auth.validator';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  message: { message: 'Too many session refresh attempts, please try again later' },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', strictLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', authenticate, logout);

// Admin-managed user creation: super_admin creates admins, admin/super_admin creates organizers
router.post(
  '/users',
  authenticate,
  authorize(['admin']),
  validate(createUserSchema),
  createUser,
);

export default router;
