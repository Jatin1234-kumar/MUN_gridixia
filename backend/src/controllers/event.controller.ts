import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { asyncHandler } from '../utils/asyncHandler';
import type { CreateEventDto, UpdateEventDto } from '../validators/event.validator';

export const eventController = {
  getAll: asyncHandler(async (_req, res) => {
    const events = await eventService.getAll();
    res.json({ data: events });
  }),

  getById: asyncHandler(async (req, res) => {
    const event = await eventService.getById(req.params.id);
    res.json({ data: event });
  }),

  create: asyncHandler(async (req: Request<object, object, CreateEventDto>, res: Response) => {
    const event = await eventService.create(req.body);
    res.status(201).json({ data: event });
  }),

  update: asyncHandler(
    async (req: Request<{ id: string }, object, UpdateEventDto>, res: Response) => {
      const event = await eventService.update(req.params.id, req.body);
      res.json({ data: event });
    },
  ),

  delete: asyncHandler(async (req, res) => {
    await eventService.delete(req.params.id);
    res.status(204).send();
  }),
};
