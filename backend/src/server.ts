import 'dotenv/config';
import app from './app';
import { config } from './config';
import { initSentry, flushSentry, Sentry } from './config/sentry';
import { startJobs, stopJobs } from './jobs';
import { closeAllQueues } from './queues';
import { closeRedisConnection } from './queues/connection';
import { createLogger } from './utils/logger';

initSentry();

const log = createLogger('server');

if (config.env !== 'test') {
  startJobs();
}

Sentry.setupExpressErrorHandler(app);

const server = app.listen(config.port, () => {
  log.info(`running on port ${config.port} in ${config.env} mode`);
});

async function shutdown(signal: string): Promise<void> {
  log.info(`${signal} received — shutting down`);
  server.close(async () => {
    const results = await Promise.allSettled([
      stopJobs(),
      closeAllQueues(),
      closeRedisConnection(),
      flushSentry(),
    ]);
    for (const r of results) {
      if (r.status === 'rejected')
        log.error('shutdown step failed', { error: (r.reason as Error).message });
    }
    log.info('shutdown complete');
    process.exit(0);
  });
}

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
