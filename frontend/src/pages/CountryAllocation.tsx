import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  Flag,
  Landmark,
  Loader2,
  MapPinned,
  Sparkles,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { readJson } from '@/lib/storage';
import type { Committee, DelegateApplicationDraft, Event, PaymentSession } from '@/types';

const delegateDraftKey = 'mun-gridixia:delegate-application-draft:v1';
const paymentSessionKey = 'mun-gridixia:payment-session:v1';

function countryFlag(country?: string) {
  if (!country) return '🏳️';

  const normalized = country.toLowerCase();
  const map: Record<string, string> = {
    india: '🇮🇳',
    unitedstates: '🇺🇸',
    usa: '🇺🇸',
    uk: '🇬🇧',
    unitedkingdom: '🇬🇧',
    france: '🇫🇷',
    germany: '🇩🇪',
    japan: '🇯🇵',
    china: '🇨🇳',
    canada: '🇨🇦',
    australia: '🇦🇺',
    brazil: '🇧🇷',
    southafrica: '🇿🇦',
    uae: '🇦🇪',
  };

  return map[normalized.replace(/[^a-z]/g, '')] ?? '🏳️';
}

function LoadingCard() {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-3 w-64 rounded-full bg-white/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-3 h-6 w-32 rounded-full bg-white/5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AllocationField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-gold-400" />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function CountryAllocation() {
  const { data: committees = [], isLoading: committeesLoading } = useCommittees();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const [draft, setDraft] = useState<Partial<DelegateApplicationDraft> | undefined>(undefined);
  const [session, setSession] = useState<PaymentSession | undefined>(undefined);

  useEffect(() => {
    setDraft(readJson<DelegateApplicationDraft>(delegateDraftKey));
    setSession(readJson<PaymentSession>(paymentSessionKey));
  }, []);

  const loading = committeesLoading || eventsLoading || draft === undefined;

  const allocatedCommittee = useMemo(() => {
    const committeeId = draft?.committeePreference.preferredCommitteeId ?? session?.committeeId;
    return committees.find((committee: Committee) => committee.id === committeeId);
  }, [committees, draft, session]);

  const allocatedEvent = useMemo(() => {
    const eventId = allocatedCommittee?.eventId ?? session?.eventId;
    return events.find((event: Event) => event.id === eventId);
  }, [allocatedCommittee, events, session]);

  const countryName = draft?.countryPreference.firstChoiceCountry || 'Pending allocation';
  const flag = countryFlag(draft?.countryPreference.firstChoiceCountry);
  const committeeName =
    allocatedCommittee?.name ||
    draft?.committeePreference.preferredCommitteeName ||
    'Awaiting assignment';
  const agenda =
    allocatedCommittee?.topic ||
    allocatedEvent?.description ||
    'Committee agenda will appear once allocation is confirmed.';
  const allocationDate = session?.updatedAt || draft?.personal.dateOfBirth || '';

  const isPending = !draft?.countryPreference.firstChoiceCountry || !allocatedCommittee;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Country Allocation"
          subtitle="Diplomatic assignment details for your delegate portfolio"
        />
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Country Allocation"
        subtitle="Elegant diplomatic assignment view for country, committee, agenda, and allocation date"
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href="/delegates">Update Application</a>
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="glass-card overflow-hidden border-white/[0.08]">
          <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardDescription className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Delegate Portfolio
                </CardDescription>
                <CardTitle className="mt-2 text-2xl text-foreground">Country Allocation</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Review your diplomatic assignment in a premium card designed for quick operational
                  scanning.
                </p>
              </div>
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-right',
                  isPending
                    ? 'border-amber-500/20 bg-amber-500/10'
                    : 'border-emerald-500/20 bg-emerald-500/10',
                )}
              >
                <p
                  className={cn(
                    'text-[10px] uppercase tracking-[0.3em]',
                    isPending ? 'text-amber-300' : 'text-emerald-300',
                  )}
                >
                  Allocation State
                </p>
                <p
                  className={cn(
                    'mt-1 text-2xl font-semibold',
                    isPending ? 'text-amber-200' : 'text-emerald-200',
                  )}
                >
                  {isPending ? 'Pending' : 'Confirmed'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-gold-500/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-gold-500/20 bg-gold-500/10 text-4xl shadow-inner shadow-gold-500/10">
                    {flag}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                      Country Flag
                    </p>
                    <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                      {countryName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isPending ? 'pending' : 'active'}>
                        {isPending ? 'Waiting for assignment' : 'Assigned delegate country'}
                      </Badge>
                      <Badge variant="default">
                        {session?.paymentMethod
                          ? session.paymentMethod.replace('_', ' ')
                          : 'delegate profile'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <AllocationField label="Committee" value={committeeName} icon={Landmark} />
                  <AllocationField
                    label="Allocation Date"
                    value={allocationDate ? formatDate(allocationDate) : 'Pending'}
                    icon={CalendarDays}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                      <Flag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                        Country Name
                      </p>
                      <p className="mt-1 text-lg font-medium text-foreground">{countryName}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                        Agenda
                      </p>
                      <p className="mt-1 text-lg font-medium text-foreground">{agenda}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-2xl border',
                        isPending
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
                      )}
                    >
                      {isPending ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-lg font-medium text-foreground">
                        {isPending ? 'Pending allocation review' : 'Allocation confirmed'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  <MapPinned className="h-3.5 w-3.5 text-gold-400" />
                  Committee
                </div>
                <p className="mt-3 text-sm text-foreground">{committeeName}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  <Landmark className="h-3.5 w-3.5 text-gold-400" />
                  Agenda Source
                </div>
                <p className="mt-3 text-sm text-foreground">
                  {allocatedEvent?.name || 'Event profile pending'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-gold-400" />
                  Delegate Load
                </div>
                <p className="mt-3 text-sm text-foreground">
                  {allocatedCommittee
                    ? `${formatNumber(allocatedCommittee.delegates ?? 0)} / ${formatNumber(allocatedCommittee.capacity ?? 0)}`
                    : 'Pending assignment'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 text-gold-400" />
                  Availability
                </div>
                <p className="mt-3 text-sm text-foreground">
                  {isPending ? 'Waiting on committee allocation' : 'Allocation live'}
                </p>
              </div>
            </div>

            {isPending && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
                <div>
                  <p className="text-sm font-medium text-amber-100">Allocation pending</p>
                  <p className="mt-1 text-sm text-amber-100/75">
                    Your country allocation will appear here once the delegate assignment is
                    confirmed.
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href="/delegates">Resume Application</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
