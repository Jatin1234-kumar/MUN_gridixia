import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCommittees } from '@/hooks/useCommittees';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Committee } from '@/types';

type SortKey = 'name' | 'fill';
type FilterType = 'all' | 'MUN' | 'YP';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'fill', label: 'Fill Rate' },
];

export default function Committees() {
  const { data: committees = [], isLoading, error } = useCommittees();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

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
      result = result.filter((c) => (filterType === 'MUN' ? c.type === 'MUN' : c.type === 'YP'));
    }

    result.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      const fillA = a.capacity > 0 ? a.delegates / a.capacity : 0;
      const fillB = b.capacity > 0 ? b.delegates / b.capacity : 0;
      return fillB - fillA;
    });

    return result;
  }, [committees, search, filterType, sortKey]);

  if (isLoading) return <PageLoader />;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Committees" subtitle="Active committees and delegate allocations" />
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
        <PageHeader title="Committees" subtitle="Active committees and delegate allocations" />
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
      <PageHeader title="Committees" subtitle="Active committees and delegate allocations" />

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
    committee.capacity > 0 ? Math.round((committee.delegates / committee.capacity) * 100) : 0;

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
                  {committee.delegates}/{committee.capacity} delegates
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
