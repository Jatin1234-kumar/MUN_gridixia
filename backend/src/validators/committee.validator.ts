import { z } from 'zod';
import { committeeDifficulties } from '../models/Committee';
import { eventTypes } from '../models/Event';

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

export const createCommitteeSchema = z.object({
  body: z
    .object({
      eventId: mongoId,
      name: z.string().min(3).max(200),
      abbr: z.string().min(2).max(20),
      agenda: z.string().min(5).max(2000),
      topic: z.string().min(5).max(1000),
      type: z.enum(eventTypes),
      difficulty: z.enum(committeeDifficulties).default('intermediate'),
      capacity: z.number().int().min(1).max(1000),
      filledSeats: z.number().int().min(0).default(0),
    })
    .refine((b) => b.filledSeats <= b.capacity, {
      message: 'filledSeats cannot exceed capacity',
      path: ['filledSeats'],
    }),
});

export const updateCommitteeSchema = z.object({
  params: z.object({ id: mongoId }),
  body: z.object({
    name: z.string().min(3).max(200).optional(),
    abbr: z.string().min(2).max(20).optional(),
    agenda: z.string().min(5).max(2000).optional(),
    topic: z.string().min(5).max(1000).optional(),
    type: z.enum(eventTypes).optional(),
    difficulty: z.enum(committeeDifficulties).optional(),
    capacity: z.number().int().min(1).max(1000).optional(),
    filledSeats: z.number().int().min(0).optional(),
    isLocked: z.boolean().optional(),
  }),
});

export const committeeParamSchema = z.object({
  params: z.object({ id: mongoId }),
});

export const getByEventSchema = z.object({
  params: z.object({ eventId: mongoId }),
});

export type CreateCommitteeDto = z.infer<typeof createCommitteeSchema>['body'];
export type UpdateCommitteeDto = z.infer<typeof updateCommitteeSchema>['body'];
