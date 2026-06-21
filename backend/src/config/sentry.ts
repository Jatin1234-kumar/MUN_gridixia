import * as Sentry from '@sentry/node';
import { config } from '../config';

let initialized = false;

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

export function captureError(error: Error, context?: {
  level?: Sentry.SeverityLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
}): void {
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
