import { getDeadLetterQueue, QUEUE } from '../queues';
import { getQrQueue, getCertificateQueue, getEmailQueue } from '../queues';
import { createLogger } from '../utils/logger';

const log = createLogger('dlq');

function getOriginalQueue(queueName: string) {
  switch (queueName) {
    case QUEUE.QR:
      return getQrQueue();
    case QUEUE.CERTIFICATE:
      return getCertificateQueue();
    case QUEUE.EMAIL:
      return getEmailQueue();
    default:
      return null;
  }
}

export async function listDlqJobs(start = 0, end = 50) {
  const dlq = getDeadLetterQueue();
  const jobs = await dlq.getJobs(['waiting', 'active', 'completed', 'failed'], start, end);
  return jobs.map((job) => ({
    id: job.id,
    data: job.data,
    timestamp: job.timestamp,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
  }));
}

export async function replayDlqJob(jobId: string) {
  const dlq = getDeadLetterQueue();
  const job = await dlq.getJob(jobId);

  if (!job) {
    throw new Error(`DLQ job ${jobId} not found`);
  }

  const { queue: queueName, data } = job.data as {
    queue: string;
    jobId: string;
    data: Record<string, unknown>;
    error: string;
  };

  const targetQueue = getOriginalQueue(queueName);
  if (!targetQueue) {
    throw new Error(`Original queue "${queueName}" not found`);
  }

  log.info(`replaying job ${jobId} from DLQ to ${queueName}`, {
    jobId,
    meta: { originalQueue: queueName },
  });

  await targetQueue.add(`replay-${jobId}`, data as never, {
    jobId: `replay:${queueName}:${jobId}:${Date.now()}`,
  });

  await job.remove();
  log.info(`job ${jobId} replayed and removed from DLQ`, { jobId });

  return { replayed: true, jobId, targetQueue: queueName };
}

export async function replayAllDlqJobs() {
  const dlq = getDeadLetterQueue();
  const jobs = await dlq.getJobs(['waiting']);
  const results: Array<{ jobId: string; success: boolean; error?: string }> = [];

  for (const job of jobs) {
    try {
      await replayDlqJob(job.id!);
      results.push({ jobId: job.id!, success: true });
    } catch (err) {
      results.push({ jobId: job.id!, success: false, error: (err as Error).message });
    }
  }

  log.info(`replayed ${results.filter((r) => r.success).length}/${results.length} DLQ jobs`);
  return results;
}

export async function clearDlq() {
  const dlq = getDeadLetterQueue();
  const jobs = await dlq.getJobs(['waiting', 'active', 'completed', 'failed']);
  await Promise.all(jobs.map((j) => j.remove()));
  log.info(`cleared ${jobs.length} jobs from DLQ`);
  return { cleared: jobs.length };
}
