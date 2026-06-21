import { z } from 'zod';

export const createDelegateSchema = z.object({
  body: z.object({
    name:      z.string().min(2).max(200),
    country:   z.string().min(2).max(100),
    committee: z.string().min(1).max(50),
  }),
});

export const updateDelegateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body:   createDelegateSchema.shape.body.partial().extend({
    status: z.enum(['confirmed', 'pending', 'waitlisted']).optional(),
  }),
});

export const getDelegateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type CreateDelegateDto = z.infer<typeof createDelegateSchema>['body'];
export type UpdateDelegateDto = z.infer<typeof updateDelegateSchema>['body'];
