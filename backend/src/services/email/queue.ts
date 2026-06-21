import { dispatchEmailJob, getEmailQueue } from '../../queues';
import type { EmailTemplateName, QueuedEmail } from './types';

export async function enqueueEmail<T extends EmailTemplateName>(job: QueuedEmail<T>) {
  return dispatchEmailJob(job as QueuedEmail);
}

// Kept for backwards-compat — the actual worker now lives in src/workers/email.worker.ts
export function startEmailWorker() {
  // no-op: worker is started via startAllWorkers() in src/workers/index.ts
}

export function closeEmailWorker() {
  return getEmailQueue().close();
}
