import type { Worker } from 'bullmq';
import { startQrWorker } from './qr.worker';
import { startCertificateWorker } from './certificate.worker';
import { startEmailWorker } from './email.worker';
import { registerWorkers } from './monitor';
import { createLogger } from '../utils/logger';

export { startQrWorker, startCertificateWorker, startEmailWorker };

const log = createLogger('workers');

let workers: Worker[] = [];

export function startAllWorkers(): void {
  workers = [
    startQrWorker(),
    startCertificateWorker(),
    startEmailWorker(),
  ];

  registerWorkers(workers);
  log.info(`all ${workers.length} workers started`);
}

export async function stopAllWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
  log.info('all workers stopped');
}

export function getActiveWorkers(): Worker[] {
  return workers;
}
