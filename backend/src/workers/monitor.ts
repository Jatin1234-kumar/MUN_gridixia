import type { Worker } from 'bullmq';
import {
  QUEUE,
  getQrQueue,
  getCertificateQueue,
  getEmailQueue,
  getDeadLetterQueue,
} from '../queues';
import { createLogger } from '../utils/logger';

const log = createLogger('monitor');

export interface WorkerHealth {
  queueName: string;
  isRunning: boolean;
  metrics: {
    processed: number;
    failed: number;
    active: number;
    startedAt: string;
  };
}

export interface QueueHealth {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

let trackedWorkers: Worker[] = [];

export function registerWorkers(workers: Worker[]): void {
  trackedWorkers = workers;
  log.info(`registered ${workers.length} workers for monitoring`);
}

export async function getWorkerHealth(): Promise<WorkerHealth[]> {
  return trackedWorkers.map((w) => {
    const m = (
      w as Worker & {
        metrics?: { processed: number; failed: number; active: number; startedAt: Date };
      }
    ).metrics;
    return {
      queueName: w.name,
      isRunning: w.isRunning(),
      metrics: {
        processed: m?.processed ?? 0,
        failed: m?.failed ?? 0,
        active: m?.active ?? 0,
        startedAt: m?.startedAt?.toISOString() ?? new Date().toISOString(),
      },
    };
  });
}

const QUEUE_GETTERS: Record<string, () => ReturnType<typeof getQrQueue>> = {
  [QUEUE.QR]: getQrQueue,
  [QUEUE.CERTIFICATE]: getCertificateQueue,
  [QUEUE.EMAIL]: getEmailQueue,
  [QUEUE.DEAD_LETTER]: getDeadLetterQueue,
};

export async function getQueueStats(): Promise<QueueHealth[]> {
  const queueNames = Object.values(QUEUE);
  const stats: QueueHealth[] = [];

  for (const name of queueNames) {
    try {
      const getter = QUEUE_GETTERS[name];
      if (!getter) continue;
      const queue = getter();

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats.push({
        queueName: name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: 0,
      });
    } catch (err) {
      log.error(`failed to get stats for queue ${name}`, {
        meta: { error: (err as Error).message },
      });
      stats.push({
        queueName: name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      });
    }
  }

  return stats;
}
