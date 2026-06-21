import * as Sentry from '@sentry/node';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  jobId?: string;
  queueName?: string;
  attempt?: number;
  duration?: number;
  meta?: Record<string, unknown>;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  const base = `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
  const parts = [base];
  if (entry.jobId) parts.push(`job=${entry.jobId}`);
  if (entry.queueName) parts.push(`queue=${entry.queueName}`);
  if (entry.attempt !== undefined) parts.push(`attempt=${entry.attempt}`);
  if (entry.duration !== undefined) parts.push(`duration=${entry.duration}ms`);
  if (entry.meta && Object.keys(entry.meta).length > 0) {
    parts.push(`meta=${JSON.stringify(entry.meta)}`);
  }
  return parts.join(' ');
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  const line = formatEntry(entry);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function sentryCapture(entry: LogEntry): void {
  if (entry.level === 'error') {
    Sentry.withScope((scope) => {
      scope.setTag('context', entry.context);
      scope.setTag('log_level', entry.level);
      if (entry.jobId) scope.setTag('job_id', entry.jobId);
      if (entry.queueName) scope.setTag('queue_name', entry.queueName);
      if (entry.meta) scope.setExtras(entry.meta);
      Sentry.captureMessage(`[${entry.context}] ${entry.message}`, 'error');
    });
  } else if (entry.level === 'warn') {
    Sentry.withScope((scope) => {
      scope.setTag('context', entry.context);
      if (entry.jobId) scope.setTag('job_id', entry.jobId);
      Sentry.captureMessage(`[${entry.context}] ${entry.message}`, 'warning');
    });
  }
}

export function createLogger(context: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      emit({ timestamp: new Date().toISOString(), level: 'debug', context, message, meta });
    },
    info(message: string, meta?: Record<string, unknown>) {
      emit({ timestamp: new Date().toISOString(), level: 'info', context, message, meta });
    },
    warn(message: string, meta?: Record<string, unknown>) {
      const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'warn', context, message, meta };
      emit(entry);
      sentryCapture(entry);
    },
    error(message: string, meta?: Record<string, unknown>) {
      const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'error', context, message, meta };
      emit(entry);
      sentryCapture(entry);
    },
    errorWithException(error: Error, meta?: Record<string, unknown>) {
      const entry: LogEntry = { timestamp: new Date().toISOString(), level: 'error', context, message: error.message, meta };
      emit(entry);
      Sentry.withScope((scope) => {
        scope.setTag('context', context);
        if (meta) scope.setExtras(meta);
        scope.setExtra('log_message', error.message);
        Sentry.captureException(error);
      });
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

// ── Error tracking helpers ─────────────────────────────────────────────────

export function trackPaymentFailure(data: {
  orderId: string;
  error: string;
  amount?: number;
  method?: string;
  userId?: string;
}): void {
  const log = createLogger('payment');
  log.error(`Payment failed: ${data.error}`, {
    meta: {
      orderId: data.orderId,
      amount: data.amount,
      method: data.method,
      userId: data.userId,
    },
  });
  Sentry.withScope((scope) => {
    scope.setTag('category', 'payment_failure');
    scope.setTag('order_id', data.orderId);
    scope.setExtras({
      amount: data.amount,
      method: data.method,
      userId: data.userId,
    });
    scope.setLevel('error');
    Sentry.captureMessage(`Payment failed: ${data.error}`, 'error');
  });
}

export function trackCertificateFailure(data: {
  certificateId: string;
  error: string;
  eventName?: string;
  recipientName?: string;
}): void {
  const log = createLogger('certificate');
  log.error(`Certificate generation failed: ${data.error}`, {
    meta: {
      certificateId: data.certificateId,
      eventName: data.eventName,
      recipientName: data.recipientName,
    },
  });
  Sentry.withScope((scope) => {
    scope.setTag('category', 'certificate_failure');
    scope.setTag('certificate_id', data.certificateId);
    scope.setExtras({
      eventName: data.eventName,
      recipientName: data.recipientName,
    });
    scope.setLevel('error');
    Sentry.captureMessage(`Certificate failure: ${data.error}`, 'error');
  });
}

export function trackApiFailure(data: {
  method: string;
  path: string;
  statusCode: number;
  error: string;
  userId?: string;
}): void {
  const log = createLogger('api');
  log.error(`${data.method} ${data.path} ${data.statusCode}: ${data.error}`, {
    meta: {
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      userId: data.userId,
    },
  });
  Sentry.withScope((scope) => {
    scope.setTag('category', 'api_failure');
    scope.setTag('http_method', data.method);
    scope.setTag('http_path', data.path);
    scope.setTag('http_status', String(data.statusCode));
    scope.setExtra('userId', data.userId);
    scope.setLevel(data.statusCode >= 500 ? 'error' : 'warning');
    Sentry.captureMessage(`API ${data.method} ${data.path} ${data.statusCode}`, data.statusCode >= 500 ? 'error' : 'warning');
  });
}
