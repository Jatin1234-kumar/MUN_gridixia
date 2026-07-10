import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const eventSchema = z
  .object({
    name: z.string().min(3, 'Min 3 characters').max(200),
    slug: z
      .string()
      .min(3, 'Min 3 characters')
      .max(220)
      .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
    description: z.string().min(10, 'Min 10 characters').max(5000),
    type: z.enum(['MUN', 'YOUTH_PARLIAMENT']),
    startAt: z.string().min(1, 'Start date is required'),
    endAt: z.string().min(1, 'End date is required'),
    location: z.string().min(2, 'Min 2 characters').max(255),
    timezone: z.string().min(2).max(100).default('UTC'),
    capacity: z.coerce.number().int().min(1, 'Min 1').max(100000),
    baseFee: z.coerce.number().min(0, 'Must be 0 or more').default(3500),
    isPublic: z.boolean().default(true),
  })
  .refine((d) => new Date(d.endAt).getTime() > new Date(d.startAt).getTime(), {
    message: 'End date must be after start date',
    path: ['endAt'],
  });

export type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  onSubmit: (values: EventFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function EventForm({ onSubmit, isLoading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: 'MUN', timezone: 'UTC', isPublic: true, capacity: 100, baseFee: 3500 },
  });

  // Auto-generate slug from name
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setValue('slug', slug, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Event Name</Label>
        <Input
          id="name"
          placeholder="GRIDIXIA MUN 2025"
          {...register('name')}
          onChange={(e) => {
            register('name').onChange(e);
            handleNameChange(e);
          }}
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" placeholder="gridixia-mun-2025" {...register('slug')} />
        {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="flex w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50 resize-none"
          placeholder="Event description (min 10 characters)…"
        />
        {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            {...register('type')}
            className="flex h-9 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50"
          >
            <option value="MUN">MUN</option>
            <option value="YOUTH_PARLIAMENT">Youth Parliament</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" type="number" min={1} {...register('capacity')} />
          {errors.capacity && <p className="text-xs text-red-400">{errors.capacity.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="baseFee">Base Registration Fee (₹)</Label>
          <Input id="baseFee" type="number" min={0} step={1} {...register('baseFee')} />
          {errors.baseFee && <p className="text-xs text-red-400">{errors.baseFee.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startAt">Start Date &amp; Time</Label>
          <Input id="startAt" type="datetime-local" {...register('startAt')} />
          {errors.startAt && <p className="text-xs text-red-400">{errors.startAt.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endAt">End Date &amp; Time</Label>
          <Input id="endAt" type="datetime-local" {...register('endAt')} />
          {errors.endAt && <p className="text-xs text-red-400">{errors.endAt.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" placeholder="New Delhi, India" {...register('location')} />
        {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isPublic"
          type="checkbox"
          defaultChecked
          {...register('isPublic')}
          className="h-4 w-4 rounded border-white/20 bg-navy-800 accent-gold-500"
        />
        <Label htmlFor="isPublic" className="cursor-pointer">Public event</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating…' : 'Create Event'}
      </Button>
    </form>
  );
}
