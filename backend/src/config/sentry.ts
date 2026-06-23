import * as Sentry from '@sentry/node';
import { config } from '../config';

let initialized = false;

const PII_KEYS = [
  'password',
  'email',
  'firstName',
  'lastName',
  'name',
  'phone',
  'token',
  'secret',
  'authorization',
  'cookie',
];

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[Filtered]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function initSentry(): void {
  if (initialized || !config.sentry.dsn) return;

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    enabled: config.isProd || config.isDev,
    tracesSampleRate: config.isProd ? 0.2 : 1.0,
    profilesSampleRate: config.isProd ? 0.1 : 0,
    normalizeDepth: 4,
    maxValueLength: 500,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['cookie'];
        delete event.request.headers['authorization'];
      }
      if (event.request?.data && typeof event.request.data === 'object') {
        event.request.data = sanitizeObject(event.request.data as Record<string, unknown>);
      }
      if (event.request?.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = '[Filtered]';
      }
      if (event.extra && typeof event.extra === 'object') {
        event.extra = sanitizeObject(event.extra as Record<string, unknown>);
      }
      const statusCodeTag = event.tags?.status_code;
      if (statusCodeTag) {
        const code = Number(statusCodeTag);
        if (code >= 400 && code < 500) return null;
      }
      return event;
    },
    integrations: [
      Sentry.httpIntegration(),
      Sentry.consoleIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
  });

  initialized = true;
}

export function captureError(
  error: Error,
  context?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    fingerprint?: string[];
  },
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context?.level) scope.setLevel(context.level);
    if (context?.tags) scope.setTags(context.tags);
    if (context?.extra) scope.setExtras(context.extra);
    if (context?.fingerprint) scope.setFingerprint(context.fingerprint);
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!initialized) return;
  Sentry.captureMessage(message, level);
}

export function flushSentry(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

export { Sentry };
