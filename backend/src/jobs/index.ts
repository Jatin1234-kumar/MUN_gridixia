import { startAllWorkers, stopAllWorkers } from '../workers';
import { createLogger } from '../utils/logger';

const log = createLogger('jobs');

export function startJobs(): void {
  log.info('starting job processing');
  startAllWorkers();
}

export async function stopJobs(): Promise<void> {
  log.info('stopping job processing');
  await stopAllWorkers();
}
