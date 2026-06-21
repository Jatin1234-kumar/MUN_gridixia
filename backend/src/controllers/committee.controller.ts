import { committeeService } from '../services/committee.service';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthenticatedRequest } from '../middleware/authenticate';

export const committeeController = {
  getByEventId: asyncHandler(async (req, res) => {
    const data = await committeeService.getByEventId(req.params.eventId);
    res.json({ data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await committeeService.getById(req.params.id);
    res.json({ data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await committeeService.create(req.body);
    res.status(201).json({ data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await committeeService.update(req.params.id, req.body);
    res.json({ data });
  }),

  delete: asyncHandler(async (req, res) => {
    const actorId = (req as unknown as AuthenticatedRequest).user?.sub;
    await committeeService.delete(req.params.id, actorId);
    res.status(204).send();
  }),
};
