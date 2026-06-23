import { z } from 'zod';

const envSchema = z.object({
  // ── Server ────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535),

  // ── MongoDB ───────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(1, { message: 'MONGODB_URI is required' }),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' }),

  // ── Razorpay ──────────────────────────────────────────────────────────────
  RAZORPAY_KEY_ID: z.string().min(1, { message: 'RAZORPAY_KEY_ID is required' }),
  RAZORPAY_SECRET: z.string().min(1, { message: 'RAZORPAY_SECRET is required' }),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, { message: 'RAZORPAY_WEBHOOK_SECRET is required' }),

  // ── Cloudinary ────────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, { message: 'CLOUDINARY_CLOUD_NAME is required' }),
  CLOUDINARY_API_KEY: z.string().min(1, { message: 'CLOUDINARY_API_KEY is required' }),
  CLOUDINARY_API_SECRET: z.string().min(1, { message: 'CLOUDINARY_API_SECRET is required' }),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().min(1, { message: 'REDIS_URL is required' }),

  // ── Email / Resend ────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1, { message: 'RESEND_API_KEY is required' }),
  EMAIL_FROM: z.string().min(1, { message: 'EMAIL_FROM is required' }),

  // ── CORS ─────────────────────────────────────────────────────────────────
  CORS_ORIGINS: z.string().optional(),

  // ── Sentry ───────────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().optional(),
});

// Infer the validated type so consumers get full type-safety
export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues
    .map(({ path, message }) => `  ✖  ${path.join('.')}: ${message}`)
    .join('\n');

  console.error('\n━━━  Missing or invalid environment variables  ━━━\n');
  console.error(lines);
  console.error('\n━━━  Fix the above variables and restart  ━━━\n');
  process.exit(1);
}

export const env: Env = parsed.data;
