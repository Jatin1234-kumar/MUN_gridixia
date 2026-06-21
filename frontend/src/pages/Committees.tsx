import { Building2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCommittees } from '@/hooks/useCommittees';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Committees() {
  const { data: committees = [], isLoading, error } = useCommittees();

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
      <PageHeader
        title="Committees"
        subtitle="Active committees and delegate allocations"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {committees.map((committee, i) => {
          const fill = committee.capacity > 0
            ? Math.round((committee.delegates / committee.capacity) * 100)
            : 0;
          return (
            <motion.div
              key={committee.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group hover:shadow-card-hover transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/10 border border-gold-500/20">
                      <span className="text-[10px] font-bold text-gold-400">{committee.abbr}</span>
                    </div>
                    <Badge variant={committee.type === 'MUN' ? 'mun' : 'parliament'}>
                      {committee.type === 'MUN' ? 'MUN' : 'YP'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{committee.name}</h3>
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
