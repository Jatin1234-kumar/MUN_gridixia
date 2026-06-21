import { Request, Response } from 'express';
import { delegateService } from '../services/delegate.service';
import { asyncHandler } from '../utils/asyncHandler';
import { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';

export const delegateController = {
  getAll: asyncHandler(async (_req, res) => {
    res.json({ data: delegateService.getAll() });
  }),

  getById: asyncHandler(async (req, res) => {
    res.json({ data: delegateService.getById(req.params.id) });
  }),

  create: asyncHandler(async (req: Request<object, object, CreateDelegateDto>, res: Response) => {
    res.status(201).json({ data: delegateService.create(req.body) });
  }),

  update: asyncHandler(async (req: Request<{ id: string }, object, UpdateDelegateDto>, res: Response) => {
    res.json({ data: delegateService.update(req.params.id, req.body) });
  }),

  delete: asyncHandler(async (req, res) => {
    delegateService.delete(req.params.id);
    res.status(204).send();
  }),
};
