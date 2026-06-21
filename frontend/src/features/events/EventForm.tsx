import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const eventSchema = z.object({
  name:        z.string().min(3, 'Name must be at least 3 characters'),
  date:        z.string().min(1, 'Date is required'),
  type:        z.enum(['MUN', 'YOUTH_PARLIAMENT']),
  location:    z.string().min(2, 'Location is required'),
  description: z.string().max(2000).optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  onSubmit: (values: EventFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function EventForm({ onSubmit, isLoading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" placeholder="GRIDIXIA MUN 2025" {...register('name')} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="datetime-local" {...register('date')} />
          {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
        </div>
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" placeholder="City, Country" {...register('location')} />
        {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="flex w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50 resize-none"
          placeholder="Event description…"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating…' : 'Create Event'}
      </Button>
    </form>
  );
}
