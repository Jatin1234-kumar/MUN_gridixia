import { asyncHandler } from '../utils/asyncHandler';
import { getWorkerHealth, getQueueStats } from '../workers/monitor';
import { listDlqJobs } from './dlq.controller';
import { createLogger } from '../utils/logger';

const log = createLogger('monitoring');

export const getSystemHealth = asyncHandler(async (_req, res) => {
  const [workers, queues] = await Promise.all([
    getWorkerHealth(),
    getQueueStats(),
  ]);

  const allHealthy = workers.every((w) => w.isRunning);
  const totalFailed = workers.reduce((sum, w) => sum + w.metrics.failed, 0);
  const totalProcessed = workers.reduce((sum, w) => sum + w.metrics.processed, 0);

  let dlqJobs: Array<{ id: string | null; data: unknown }> = [];
  try {
    dlqJobs = await listDlqJobs(0, 10);
  } catch {
    log.warn('Failed to fetch DLQ jobs for health check');
  }

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    workers: workers.map((w) => ({
      name: w.queueName,
      running: w.isRunning,
      metrics: w.metrics,
    })),
    queues,
    dlq: { count: dlqJobs.length, jobs: dlqJobs },
    totals: { processed: totalProcessed, failed: totalFailed },
  });
});

export const getSentryHealth = asyncHandler(async (_req, res) => {
  const dsn = process.env.SENTRY_DSN;
  res.json({
    configured: !!dsn,
    dsnPresent: !!dsn,
    environment: process.env.NODE_ENV ?? 'development',
  });
});

export const getErrorStats = asyncHandler(async (_req, res) => {
  const workers = await getWorkerHealth();
  const queues = await getQueueStats();

  const failedQueues = queues.filter((q) => q.failed > 0);
  const totalFailed = workers.reduce((sum, w) => sum + w.metrics.failed, 0);
  const totalProcessed = workers.reduce((sum, w) => sum + w.metrics.processed, 0);
  const errorRate = totalProcessed > 0 ? ((totalFailed / totalProcessed) * 100).toFixed(2) : '0.00';

  res.json({
    timestamp: new Date().toISOString(),
    errorRate: `${errorRate}%`,
    totalProcessed,
    totalFailed,
    failedQueues: failedQueues.map((q) => ({
      name: q.queueName,
      failed: q.failed,
    })),
    memoryUsage: {
      rss: formatBytes(process.memoryUsage().rss),
      heapUsed: formatBytes(process.memoryUsage().heapUsed),
      heapTotal: formatBytes(process.memoryUsage().heapTotal),
      external: formatBytes(process.memoryUsage().external),
    },
  });
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
