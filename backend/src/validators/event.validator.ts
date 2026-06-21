import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    name:        z.string().min(3).max(200),
    date:        z.string().datetime(),
    type:        z.enum(['MUN', 'YOUTH_PARLIAMENT']),
    status:      z.enum(['active', 'pending', 'inactive']).default('pending'),
    location:    z.string().min(2).max(200),
    description: z.string().max(2000).optional().default(''),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body:   createEventSchema.shape.body.partial(),
});

export const getEventSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type CreateEventDto = z.infer<typeof createEventSchema>['body'];
export type UpdateEventDto = z.infer<typeof updateEventSchema>['body'];
