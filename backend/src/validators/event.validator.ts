import { z } from 'zod';

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

export const createEventSchema = z.object({
  body: z
    .object({
      name: z.string().min(3).max(200),
      slug: z.string().min(3).max(220),
      description: z.string().min(10).max(5000),
      type: z.enum(['MUN', 'YOUTH_PARLIAMENT']),
      status: z.enum(['draft', 'pending', 'active', 'inactive', 'archived']).default('draft'),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      location: z.string().min(2).max(255),
      timezone: z.string().min(2).max(100).default('UTC'),
      capacity: z.number().int().min(1).max(100000),
      registrationOpensAt: z.string().datetime().optional().nullable(),
      registrationClosesAt: z.string().datetime().optional().nullable(),
      featuredImageUrl: z.string().max(2048).optional().nullable(),
      isPublic: z.boolean().default(true),
    })
    .refine((b) => new Date(b.endAt).getTime() > new Date(b.startAt).getTime(), {
      message: 'endAt must be later than startAt',
      path: ['endAt'],
    }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: mongoId }),
  body: createEventSchema.shape.body.innerType().partial().refine(
    (b) => {
      if (b.startAt && b.endAt) {
        return new Date(b.endAt).getTime() > new Date(b.startAt).getTime();
      }
      return true;
    },
    { message: 'endAt must be later than startAt', path: ['endAt'] },
  ),
});

export const getEventSchema = z.object({
  params: z.object({ id: mongoId }),
});

export type CreateEventDto = z.infer<typeof createEventSchema>['body'];
export type UpdateEventDto = z.infer<typeof updateEventSchema>['body'];
