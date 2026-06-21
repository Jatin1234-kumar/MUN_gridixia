import { getWorkerHealth, getQueueStats } from '../workers/monitor';
import { asyncHandler } from '../utils/asyncHandler';

export const getHealth = asyncHandler(async (_req, res) => {
  const [workers, queues] = await Promise.all([getWorkerHealth(), getQueueStats()]);

  const allHealthy = workers.every((w) => w.isRunning);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    workers,
    queues,
  });
});

export const getWorkerStats = asyncHandler(async (_req, res) => {
  const workers = await getWorkerHealth();
  res.json({ workers });
});

export const getQueueStats_ = asyncHandler(async (_req, res) => {
  const queues = await getQueueStats();
  res.json({ queues });
});
