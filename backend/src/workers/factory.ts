import { Worker, type Processor, type WorkerOptions } from 'bullmq';
import * as Sentry from '@sentry/node';
import { getBullMQConnection } from '../queues/connection';
import { getDeadLetterQueue } from '../queues';
import { createLogger } from '../utils/logger';

export interface WorkerMetrics {
  processed: number;
  failed: number;
  active: number;
  startedAt: Date;
}

interface WorkerFactoryOptions<T, R> {
  queueName: string;
  processor: Processor<T, R>;
  concurrency?: number;
}

export function createWorker<T, R = unknown>({
  queueName,
  processor,
  concurrency = 1,
}: WorkerFactoryOptions<T, R>): Worker<T, R> {
  const log = createLogger(`worker:${queueName}`);
  const metrics: WorkerMetrics = { processed: 0, failed: 0, active: 0, startedAt: new Date() };

  const opts: WorkerOptions = {
    connection: getBullMQConnection(),
    concurrency,
    lockDuration: 30_000,
    stalledInterval: 15_000,
    maxStalledCount: 1,
  };

  const wrappedProcessor: Processor<T, R> = async (job) => {
    metrics.active++;
    const start = Date.now();
    try {
      log.debug(`processing job ${job.id}`, {
        jobId: job.id!,
        attempt: job.attemptsMade + 1,
        data: job.data as unknown as Record<string, unknown>,
      });

      const result = await processor(job);

      const duration = Date.now() - start;
      metrics.processed++;
      log.info(`job ${job.id} completed in ${duration}ms`, {
        jobId: job.id!,
        duration,
        attempt: job.attemptsMade + 1,
      });

      return result;
    } catch (err) {
      metrics.failed++;
      const duration = Date.now() - start;
      const error = err instanceof Error ? err : new Error(String(err));
      const remaining = (job.opts.attempts ?? 1) - job.attemptsMade - 1;

      log.error(`job ${job.id} failed: ${error.message}`, {
        jobId: job.id!,
        duration,
        attempt: job.attemptsMade + 1,
        meta: { remainingRetries: remaining, stack: error.stack },
      });

      Sentry.withScope((scope) => {
        scope.setTag('queue', queueName);
        scope.setTag('job_id', job.id!);
        scope.setTag('job_name', job.name);
        scope.setTag('attempt', String(job.attemptsMade + 1));
        scope.setTag('remaining_retries', String(remaining));
        scope.setExtra('job_data', job.data);
        scope.setExtra('error_stack', error.stack);
        scope.captureException(error);
      });

      throw err;
    } finally {
      metrics.active = Math.max(0, metrics.active - 1);
    }
  };

  const worker = new Worker<T, R>(queueName, wrappedProcessor, opts);

  worker.on('active', (job) => {
    log.debug(`job ${job.id} picked up`, { jobId: job.id! });
  });

  worker.on('completed', (job) => {
    log.info(`job ${job.id} done`, { jobId: job.id! });
  });

  worker.on('failed', (job, err) => {
    if (!job) return;

    const remaining = (job.opts.attempts ?? 1) - job.attemptsMade - 1;
    const errorName = (err as Error).message;

    log.error(`job ${job.id} failed after attempt ${job.attemptsMade}`, {
      jobId: job.id!,
      attempt: job.attemptsMade,
      meta: { remainingRetries: remaining, error: errorName },
    });

    if (job.attemptsMade >= (job.opts.attempts ?? 1) - 1) {
      log.warn(`job ${job.id} exhausted all retries — pushing to DLQ`, { jobId: job.id! });

      Sentry.withScope((scope) => {
        scope.setTag('queue', queueName);
        scope.setTag('job_id', job.id!);
        scope.setTag('dlq', 'true');
        scope.setLevel('error');
        scope.setExtra('job_data', job.data);
        Sentry.captureMessage(
          `Job ${job.id} sent to DLQ after ${job.attemptsMade} attempts`,
          'error',
        );
      });

      getDeadLetterQueue()
        .add(
          'dlq',
          {
            queue: queueName,
            jobId: job.id,
            data: job.data,
            error: errorName,
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade,
          },
          { jobId: `dlq:${queueName}:${job.id}` },
        )
        .catch((dlqErr: unknown) => {
          log.error(`failed to enqueue to DLQ: ${(dlqErr as Error).message}`, {
            jobId: job.id!,
            meta: { dlqError: (dlqErr as Error).message },
          });
        });
    }
  });

  worker.on('error', (err) => {
    log.error(`worker error: ${err.message}`, { meta: { stack: err.stack } });
    Sentry.captureException(err);
  });

  worker.on('stalled', (jobId) => {
    log.warn(`job ${jobId} stalled`, { jobId });
  });

  (worker as Worker & { metrics: WorkerMetrics }).metrics = metrics;

  log.info(`worker started (concurrency=${concurrency})`);

  return worker;
}
