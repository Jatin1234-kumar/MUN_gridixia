import { env } from './env';

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  mongo: { uri: env.MONGODB_URI },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
  },
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    secret: env.RAZORPAY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
  email: {
    from: env.EMAIL_FROM,
    resendApiKey: env.RESEND_API_KEY,
  },
  redis: { url: env.REDIS_URL },
  sentry: { dsn: env.SENTRY_DSN },
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
};
