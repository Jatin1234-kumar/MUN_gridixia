import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/features/auth/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Committee } from '@/types';

type SortKey = 'name' | 'fill';
type FilterType = 'all' | 'MUN' | 'YP';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'fill', label: 'Fill Rate' },
];

const committeeFormSchema = z.object({
  eventId:    z.string().min(1, 'Select an event'),
  name:       z.string().min(3, 'Min 3 characters').max(200),
  abbr:       z.string().min(2, 'Min 2 characters').max(20),
  topic:      z.string().min(5, 'Min 5 characters').max(1000),
  agenda:     z.string().min(5, 'Min 5 characters').max(2000),
  type:       z.enum(['MUN', 'YOUTH_PARLIAMENT']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  capacity:   z.coerce.number().int().min(1).max(1000),
});
type CommitteeFormValues = z.infer<typeof committeeFormSchema>;

function useCreateCommittee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitteeFormValues) =>
      api.post('/committees', payload).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['committees'] }),
  });
}

function CommitteeFormModal({ onClose }: { onClose: () => void }) {
  const { data: events = [] } = useEvents();
  const createCommittee = useCreateCommittee();
  const { register, handleSubmit, formState: { errors } } = useForm<CommitteeFormValues>({
    resolver: zodResolver(committeeFormSchema),
    defaultValues: { type: 'MUN', difficulty: 'intermediate', capacity: 30 },
  });

  async function onSubmit(values: CommitteeFormValues) {
    await createCommittee.mutateAsync(values);
    onClose();
  }

  const fieldClass = 'flex h-9 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50';

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
        <div className="glass-card gold-border w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-foreground">Create New Committee</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Event</Label>
              <select {...register('eventId')} className={fieldClass}>
                <option value="">Select event</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.eventId && <p className="text-xs text-red-400">{errors.eventId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input {...register('name')} placeholder="UN Security Council" />
                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Abbreviation</Label>
                <Input {...register('abbr')} placeholder="UNSC" />
                {errors.abbr && <p className="text-xs text-red-400">{errors.abbr.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Input {...register('topic')} placeholder="Addressing climate-related security threats" />
              {errors.topic && <p className="text-xs text-red-400">{errors.topic.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Agenda</Label>
              <textarea {...register('agenda')} rows={3}
                className="flex w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50 resize-none"
                placeholder="Full agenda description (min 5 characters)" />
              {errors.agenda && <p className="text-xs text-red-400">{errors.agenda.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select {...register('type')} className={fieldClass}>
                  <option value="MUN">MUN</option>
                  <option value="YOUTH_PARLIAMENT">Youth Parliament</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <select {...register('difficulty')} className={fieldClass}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" min={1} max={1000} {...register('capacity')} />
                {errors.capacity && <p className="text-xs text-red-400">{errors.capacity.message}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createCommittee.isPending}>
              {createCommittee.isPending ? 'Creating…' : 'Create Committee'}
            </Button>
          </form>
        </div>
      </motion.div>
    </>
  );
}

export default function Committees() {
  const { data: committees = [], isLoading, error } = useCommittees();
  const { hasMinimumRole } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = hasMinimumRole('organizer');

  const filtered = useMemo(() => {
    let result = [...committees];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.abbr.toLowerCase().includes(q) ||
          c.topic.toLowerCase().includes(q),
      );
    }

    if (filterType !== 'all') {
      result = result.filter((c) => (filterType === 'MUN' ? c.type === 'MUN' : c.type === 'YOUTH_PARLIAMENT'));
    }

    result.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      const fillA = a.capacity > 0 ? a.filledSeats / a.capacity : 0;
      const fillB = b.capacity > 0 ? b.filledSeats / b.capacity : 0;
      return fillB - fillA;
    });

    return result;
  }, [committees, search, filterType, sortKey]);

  if (isLoading) return <PageLoader />;

  const pageHeader = (
    <>
      <AnimatePresence>{showCreate && <CommitteeFormModal onClose={() => setShowCreate(false)} />}</AnimatePresence>
      <PageHeader
        title="Committees"
        subtitle="Active committees and delegate allocations"
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New Committee
            </Button>
          ) : undefined
        }
      />
    </>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <EmptyState
          icon={Building2}
          title="Failed to load committees"
          description="Something went wrong. Please try again."
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (committees.length === 0) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <EmptyState
          icon={Building2}
          title="No committees yet"
          description="Committees will appear here once they are created for an event."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search committees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            {(['all', 'MUN', 'YP'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  filterType === t
                    ? 'bg-gold-500/15 text-gold-400'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  sortKey === opt.key
                    ? 'bg-gold-500/15 text-gold-400'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching committees"
          description="Try adjusting your search or filter criteria."
          action={{
            label: 'Clear filters',
            onClick: () => {
              setSearch('');
              setFilterType('all');
            },
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((committee, i) => (
            <CommitteeCard key={committee.id} committee={committee} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitteeCard({ committee, index }: { committee: Committee; index: number }) {
  const fill =
    committee.capacity > 0 ? Math.round((committee.filledSeats / committee.capacity) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/committees/${committee.id}`} className="block">
        <Card className="group cursor-pointer hover:shadow-card-hover transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/10 border border-gold-500/20">
                <span className="text-xs font-bold text-gold-400">{committee.abbr}</span>
              </div>
              <Badge variant={committee.type === 'MUN' ? 'mun' : 'parliament'}>
                {committee.type === 'MUN' ? 'MUN' : 'YP'}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-gold-400 transition-colors">
              {committee.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{committee.topic}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users size={11} />
                  {committee.filledSeats}/{committee.capacity} delegates
                </span>
                <span className="text-xs font-mono text-gold-400">{fill}%</span>
              </div>
              <Progress value={fill} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
