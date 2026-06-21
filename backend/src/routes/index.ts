import { Router } from 'express';
import eventRoutes from './event.routes';
import committeeRoutes from './committee.routes';
import delegateRoutes from './delegate.routes';
import authRoutes from '../features/auth/auth.routes';
import { getHealth, getWorkerStats, getQueueStats_ } from '../controllers/monitor.controller';
import { listDlqJobs, replayDlqJob, replayAllDlqJobs, clearDlq } from '../controllers/dlq.controller';
import { getSystemHealth, getSentryHealth, getErrorStats } from '../controllers/monitoring.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

router.get('/health/workers', getHealth);
router.get('/health/workers/stats', getWorkerStats);
router.get('/health/queues', getQueueStats_);

router.get('/dlq', asyncHandler(async (_req, res) => {
  const start = Number(_req.query.start) || 0;
  const end = Number(_req.query.end) || 50;
  const jobs = await listDlqJobs(start, end);
  res.json({ jobs, count: jobs.length });
}));

router.post('/dlq/:jobId/replay', asyncHandler(async (req, res) => {
  const result = await replayDlqJob(req.params.jobId);
  res.json(result);
}));

router.post('/dlq/replay-all', asyncHandler(async (_req, res) => {
  const results = await replayAllDlqJobs();
  res.json({ results, total: results.length });
}));

router.delete('/dlq', asyncHandler(async (_req, res) => {
  const result = await clearDlq();
  res.json(result);
}));

router.get('/monitoring/health', getSystemHealth);
router.get('/monitoring/sentry', getSentryHealth);
router.get('/monitoring/errors', getErrorStats);

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/committees', committeeRoutes);
router.use('/delegates', delegateRoutes);

export default router;
