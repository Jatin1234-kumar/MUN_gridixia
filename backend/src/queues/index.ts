import { Queue, type JobsOptions } from 'bullmq';
import { getBullMQConnection } from './connection';
import type { GenerateCertificateJobData, GenerateQrJobData, QueuedEmail } from './types';

// ── Queue names ───────────────────────────────────────────────────────────────

export const QUEUE = {
  QR:          'qr-generation',
  CERTIFICATE: 'certificate-generation',
  EMAIL:       'emails',
  DEAD_LETTER: 'dead-letter',
} as const;

// ── Default retry policy ──────────────────────────────────────────────────────

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 200 },
  removeOnFail: false,
};

// ── Queue singletons ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeQueue<T = any>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getBullMQConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

let qrQueue:          Queue<GenerateQrJobData>          | undefined;
let certificateQueue: Queue<GenerateCertificateJobData> | undefined;
let emailQueue:       Queue<QueuedEmail>                | undefined;
let deadLetterQueue:  Queue<unknown>                    | undefined;

export function getQrQueue()          { return (qrQueue          ??= makeQueue<GenerateQrJobData>(QUEUE.QR)); }
export function getCertificateQueue() { return (certificateQueue ??= makeQueue<GenerateCertificateJobData>(QUEUE.CERTIFICATE)); }
export function getEmailQueue()       { return (emailQueue       ??= makeQueue<QueuedEmail>(QUEUE.EMAIL)); }
export function getDeadLetterQueue()  { return (deadLetterQueue  ??= makeQueue<unknown>(QUEUE.DEAD_LETTER)); }

// ── Typed dispatchers ─────────────────────────────────────────────────────────

export function dispatchQrJob(data: GenerateQrJobData) {
  return getQrQueue().add('generate-qr', data, {
    jobId: `qr:${data.ticketId}`,
  });
}

export function dispatchCertificateJob(data: GenerateCertificateJobData) {
  return getCertificateQueue().add('generate-certificate', data, {
    jobId: `cert:${data.certificateId}`,
  });
}

export function dispatchEmailJob(job: QueuedEmail) {
  return getEmailQueue().add(job.template, job, {
    jobId: `${job.template}:${job.to.email}:${Date.now()}`,
  });
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    qrQueue?.close(),
    certificateQueue?.close(),
    emailQueue?.close(),
    deadLetterQueue?.close(),
  ]);
}
