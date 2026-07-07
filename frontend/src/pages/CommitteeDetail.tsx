import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Target, BookOpen, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCommittees } from '@/hooks/useCommittees';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Committee } from '@/types';

const difficultyLabel: Record<string, string> = {
  beginner: 'Beginner Friendly',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const difficultyColor: Record<string, string> = {
  beginner: 'active',
  intermediate: 'pending',
  advanced: 'urgent',
};

export default function CommitteeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: committees = [], isLoading, error } = useCommittees();

  const committee = useMemo(() => committees.find((c: Committee) => c.id === id), [committees, id]);

  if (isLoading) return <PageLoader />;

  if (error || !committee) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/committees">
            <ArrowLeft size={14} /> Back to Committees
          </Link>
        </Button>
        <EmptyState
          icon={Building2}
          title="Committee not found"
          description="This committee may have been removed or the link is incorrect."
          action={{ label: 'View all committees', onClick: () => {} }}
        />
      </div>
    );
  }

  const fill =
    committee.capacity > 0 ? Math.round((committee.filledSeats / committee.capacity) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/committees">
          <ArrowLeft size={14} /> Back to Committees
        </Link>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/10 border border-gold-500/20">
              <span className="text-sm font-bold text-gold-400">{committee.abbr}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {committee.name}
                </h1>
                <Badge variant={committee.type === 'MUN' ? 'mun' : 'parliament'}>
                  {committee.type === 'MUN' ? 'Model UN' : 'Youth Parliament'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{committee.topic}</p>
            </div>
          </div>
          <Badge variant={difficultyColor[committee.difficulty] as 'active' | 'pending' | 'urgent'}>
            {difficultyLabel[committee.difficulty]}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card border-white/[0.08]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Delegates
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {committee.filledSeats}/{committee.capacity}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Fill Rate
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{fill}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Type
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {committee.type === 'MUN' ? 'MUN' : 'Youth Parliament'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Difficulty
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground capitalize">
                    {committee.difficulty}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
              <CardTitle className="text-base text-foreground">Agenda & Topic</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
                  Topic
                </p>
                <p className="text-sm text-foreground leading-relaxed">{committee.topic}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
                  Agenda
                </p>
                <p className="text-sm text-foreground leading-relaxed">{committee.agenda}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
              <CardTitle className="text-base text-foreground">Capacity</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {committee.filledSeats} of {committee.capacity} seats filled
                  </span>
                  <span className="text-xs font-mono text-gold-400">{fill}%</span>
                </div>
                <Progress value={fill} />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-1">
                  Status
                </p>
                <Badge variant={committee.isLocked ? 'urgent' : fill >= 100 ? 'inactive' : 'active'}>
                  {committee.isLocked ? 'Locked' : fill >= 100 ? 'Full' : 'Open'}
                </Badge>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-1">
                  Remaining Seats
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {Math.max(0, committee.capacity - committee.filledSeats)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
