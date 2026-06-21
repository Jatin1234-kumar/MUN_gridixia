import { z } from 'zod';

const allowedRegistrationRoles = ['participant', 'organizer', 'admin', 'delegate'] as const;

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    email: z.string().email().max(254),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
    role: z.enum(allowedRegistrationRoles).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({}),
});

export const logoutSchema = z.object({
  body: z.object({}),
});
