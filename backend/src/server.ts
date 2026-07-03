import 'dotenv/config';
import app from './app';
import { config } from './config';
import { connectMongo, disconnectMongo } from './config/mongoose';
import { seedSuperAdmin } from './features/auth/seedSuperAdmin';
import { initSentry, flushSentry, Sentry } from './config/sentry';
import { startJobs, stopJobs } from './jobs';
import { closeAllQueues } from './queues';
import { closeRedisConnection } from './queues/connection';
import { createLogger } from './utils/logger';

initSentry();

const log = createLogger('server');
let server: ReturnType<typeof app.listen> | undefined;

Sentry.setupExpressErrorHandler(app);

async function bootstrap(): Promise<void> {
  await connectMongo();
  await seedSuperAdmin();

  if (config.env !== 'test') {
    startJobs();
  }

  server = app.listen(config.port, () => {
    log.info(`running on port ${config.port} in ${config.env} mode`);
  });
}

async function shutdown(signal: string): Promise<void> {
  log.info(`${signal} received — shutting down`);

  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }

  const results = await Promise.allSettled([
    stopJobs(),
    closeAllQueues(),
    closeRedisConnection(),
    disconnectMongo(),
    flushSentry(),
  ]);

  for (const r of results) {
    if (r.status === 'rejected')
      log.error('shutdown step failed', { error: (r.reason as Error).message });
  }

  log.info('shutdown complete');
  process.exit(0);
}

void bootstrap().catch((err) => {
  log.errorWithException(err instanceof Error ? err : new Error(String(err)), {
    source: 'bootstrap',
  });
  void flushSentry(3000).finally(() => process.exit(1));
});

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  log.errorWithException(err, { source: 'uncaughtException' });
  Sentry.captureException(err);
  flushSentry(3000).then(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  log.errorWithException(error, { source: 'unhandledRejection' });
  Sentry.captureException(error);
});
