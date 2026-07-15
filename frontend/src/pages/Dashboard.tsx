import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { motion } from 'framer-motion';
import {
  Award,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Globe2,
  Landmark,
  LayoutPanelTop,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  CalendarCheck,
  CircleDollarSign,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LiveCommitteeFeed } from '@/features/dashboard/LiveCommitteeFeed';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import { useSeo, PAGE_SEO } from '@/lib/seo';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { readJson } from '@/lib/storage';
import type { Committee, DelegateApplicationDraft, Event, PaymentSession } from '@/types';

type RoleUpgradeStatus = 'idle' | 'loading' | 'success' | 'error';

function RoleUpgradeCard() {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<RoleUpgradeStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isOrganizer = user?.role === 'organizer';
  const requestedRole = isOrganizer ? 'admin' : 'organizer';
  const cardDescription = isOrganizer
    ? 'Ask super admin to upgrade your role to admin.'
    : 'Ask an admin to upgrade your role to organizer.';
  const buttonLabel = isOrganizer ? 'Request Admin Role' : 'Request Organizer Role';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/role-requests', { requestedRole, reason: reason || undefined });
      setStatus('success');
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <DataCard title="Role Upgrade Request" description={cardDescription} icon={TrendingUp}>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Request submitted. {isOrganizer ? 'Super admin' : 'An admin'} will review it shortly.
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard title="Role Upgrade Request" description={cardDescription} icon={TrendingUp}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder={`Optional: explain why you'd like to become ${isOrganizer ? 'an admin' : 'an organizer'}…`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="resize-none bg-white/[0.02] border-white/[0.08] text-sm"
        />
        {status === 'error' && (
          <p className="text-xs text-red-400">{errorMsg}</p>
        )}
        <Button type="submit" size="sm" disabled={status === 'loading'} className="w-full">
          {status === 'loading' ? 'Submitting…' : buttonLabel}
        </Button>
      </form>
    </DataCard>
  );
}

const delegateDraftKey = (userId: string) => `mun-gridixia:delegate-application-draft:v1:${userId}`;
const paymentSessionKey = (userId: string) => `mun-gridixia:payment-session:v1:${userId}`;

const paymentStatusMeta: Record<string, { label: string; color: string }> = {
  success:    { label: 'Paid',       color: 'text-emerald-400' },
  processing: { label: 'Processing', color: 'text-amber-400'   },
  pending:    { label: 'Pending',    color: 'text-gold-400'    },
  failed:     { label: 'Failed',     color: 'text-red-400'     },
};

function EventPaymentCard({
  events,
  committees,
  session,
}: {
  events: Event[];
  committees: Committee[];
  session: PaymentSession | undefined;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    () => session?.eventId ?? events[0]?.id ?? '',
  );

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // if there's a session for this event, show its data; otherwise show fee preview
  const matchedSession = session?.eventId === selectedEventId ? session : undefined;
  const eventCommittees = committees.filter((c) => c.eventId === selectedEventId);

  const baseFee = selectedEvent?.baseFee ?? 0;
  const statusMeta = matchedSession
    ? (paymentStatusMeta[matchedSession.status] ?? paymentStatusMeta.pending)
    : null;

  return (
    <DataCard title="Event Payment Summary" description="Select an event to view its payment details." icon={CircleDollarSign}>
      <div className="space-y-4">
        {/* Event selector */}
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
        >
          <option value="">Select an event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>

        {selectedEvent ? (
          <div className="space-y-3">
            {/* Event info */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Event</p>
                <CalendarCheck className="h-4 w-4 text-gold-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{selectedEvent.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(selectedEvent.startAt)} · {selectedEvent.location}
              </p>
            </div>

            {/* Payment status if session exists */}
            {matchedSession ? (
              <>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Payment Status</p>
                    <span className={`text-xs font-semibold ${statusMeta!.color}`}>{statusMeta!.label}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Committee</span>
                      <span className="text-foreground">{matchedSession.committeeAbbr} — {matchedSession.committeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Fee</span>
                      <span className="text-foreground">₹{formatNumber(matchedSession.baseFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Committee Fee</span>
                      <span className="text-foreground">₹{formatNumber(matchedSession.committeeFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span className="text-foreground">₹{formatNumber(matchedSession.serviceFee)}</span>
                    </div>
                    {matchedSession.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-emerald-400">-₹{formatNumber(matchedSession.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-foreground">₹{formatNumber(matchedSession.tax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/[0.06] pt-1.5 font-semibold">
                      <span className="text-foreground">Total</span>
                      <span className="text-gold-400">₹{formatNumber(matchedSession.amount)}</span>
                    </div>
                  </div>
                </div>
                {matchedSession.receiptId && (
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Receipt</p>
                      <p className="text-sm font-mono text-foreground mt-0.5">{matchedSession.receiptId}</p>
                    </div>
                    <Wallet className="h-4 w-4 text-gold-400" />
                  </div>
                )}
              </>
            ) : (
              /* No session — show fee preview + committees */
              <div className="space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Fee Preview</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Registration Fee</span>
                    <span className="text-gold-400 font-semibold">₹{formatNumber(baseFee)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Final amount depends on committee selection.</p>
                </div>
                {eventCommittees.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Committees ({eventCommittees.length})</p>
                    <div className="space-y-1">
                      {eventCommittees.slice(0, 4).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{c.abbr} — {c.name}</span>
                          <span className={cn(
                            'text-[10px] uppercase tracking-wider',
                            c.status === 'open' ? 'text-emerald-400' : c.status === 'full' ? 'text-red-400' : 'text-amber-400',
                          )}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button size="sm" className="w-full" asChild>
                  <Link to="/payments"><CreditCard size={13} /> Pay for this Event</Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">Select an event to see payment details.</p>
        )}
      </div>
    </DataCard>
  );
}

type DashboardStatus = 'complete' | 'in-progress' | 'pending' | 'attention';

interface VaultStatus {
  applicantName: string | null;
  applicantEmail: string | null;
  committeeName: string | null;
  committeeAbbr: string | null;
  committeeId: string | null;
  paymentVerified: boolean;
  checkedIn: boolean;
  registrationStatus: string;
}

function StatusPill({ status }: { status: DashboardStatus }) {
  const config = {
    complete: { label: 'Complete', variant: 'active' as const },
    'in-progress': { label: 'In Progress', variant: 'pending' as const },
    pending: { label: 'Pending', variant: 'inactive' as const },
    attention: { label: 'Attention', variant: 'urgent' as const },
  }[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function MetricCard({
  title,
  value,
  status,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  status: DashboardStatus;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl text-foreground">{value}</CardTitle>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <StatusPill status={status} />
        </div>
      </CardContent>
    </Card>
  );
}

function DataCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function TimelineStep({
  title,
  subtitle,
  status,
  last,
}: {
  title: string;
  subtitle: string;
  status: DashboardStatus;
  last?: boolean;
}) {
  const isComplete = status === 'complete';
  const isActive = status === 'in-progress';
  const isPending = status === 'pending';

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border',
            isComplete
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : isActive
                ? 'border-gold-500/30 bg-gold-500/10 text-gold-300'
                : 'border-white/[0.08] bg-navy-900/60 text-muted-foreground',
          )}
        >
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </div>
        {!last && <div className="mt-2 h-full w-px flex-1 bg-white/[0.08]" />}
      </div>
      <div className={cn('flex-1 pb-6', last && 'pb-0')}>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-medium',
              isPending ? 'text-muted-foreground/60' : 'text-foreground',
            )}
          >
            {title}
          </p>
          <StatusPill status={status} />
        </div>
        <p
          className={cn(
            'mt-1 text-xs',
            isPending ? 'text-muted-foreground/40' : 'text-muted-foreground',
          )}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-md bg-white/[0.06]', className)} />;
}

function MetricCardSkeleton() {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  useSeo(PAGE_SEO.dashboard);
  const { user } = useAuth();
  const { data: committees = [], isLoading: committeesLoading } = useCommittees();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const [draft, setDraft] = useState<Partial<DelegateApplicationDraft> | undefined>(undefined);
  const [session, setSession] = useState<PaymentSession | undefined>(undefined);

  const { data: vaultStatus } = useQuery<VaultStatus | null>({
    queryKey: ['vault-status', user?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: VaultStatus | null }>('/payments/my-vault-status');
      return data.data;
    },
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (!user?.id) {
      setDraft(undefined);
      setSession(undefined);
      return;
    }
    setDraft(readJson<DelegateApplicationDraft>(delegateDraftKey(user.id)));
    setSession(readJson<PaymentSession>(paymentSessionKey(user.id)));
  }, [user?.id]);

  const selectedCommittee = useMemo(() => {
    const committeeId = draft?.committeePreference?.preferredCommitteeId ?? session?.committeeId;
    return committees.find((committee: Committee) => committee.id === committeeId);
  }, [committees, draft, session]);

  const selectedEvent = useMemo(() => {
    const eventId = selectedCommittee?.eventId ?? session?.eventId;
    return events.find((event: Event) => event.id === eventId);
  }, [events, selectedCommittee, session]);

  // The vault is the source of truth. Local storage only supplies display details,
  // never milestone completion, so logging out cannot reset the journey state.
  const isPaid = Boolean(vaultStatus?.paymentVerified);
  const isAllocated = Boolean(vaultStatus?.committeeId);
  const isCheckedIn = Boolean(vaultStatus?.checkedIn);
  const isCertified = vaultStatus?.registrationStatus === 'CERTIFIED';

  const completionPercentage = useMemo(() => {
    let percentage = 20; // The authenticated registration step.
    if (isPaid) percentage += 20;
    if (isAllocated) percentage += 20;
    if (isCheckedIn) percentage += 20;
    if (isCertified) percentage += 20;
    return percentage;
  }, [isPaid, isAllocated, isCheckedIn, isCertified]);

  const registrationStatus: DashboardStatus = isPaid ? 'complete' : 'in-progress';
  const paymentStatus: DashboardStatus = isPaid ? 'complete' : 'pending';
  const committeeStatus: DashboardStatus = isAllocated ? 'complete' : (isPaid ? 'in-progress' : 'pending');
  const attendanceStatus: DashboardStatus = isCheckedIn ? 'complete' : (isAllocated ? 'in-progress' : 'pending');
  const certificateStatus: DashboardStatus = isCertified ? 'complete' : 'pending';

  const timelineSteps = [
    {
      title: 'Registered',
      subtitle: isPaid ? 'Application captured and secured.' : 'Waiting for application completion',
      status: registrationStatus,
    },
    {
      title: 'Paid',
      subtitle: 'Payment success',
      status: paymentStatus,
    },
    {
      title: 'Allocated',
      subtitle: isAllocated
        ? `Assigned to ${vaultStatus?.committeeAbbr ?? vaultStatus?.committeeName ?? 'your committee'}`
        : 'Committee not yet assigned',
      status: committeeStatus,
    },
    {
      title: 'Checked In',
      subtitle: 'Attendance verification status',
      status: attendanceStatus,
    },
    {
      title: 'Certified',
      subtitle: 'Certificate availability status',
      status: certificateStatus,
    },
  ];

  const committeeAllocation = vaultStatus?.committeeAbbr
    ? vaultStatus.committeeAbbr
    : selectedCommittee
    ? selectedCommittee.abbr
    : draft?.committeePreference?.preferredCommitteeName || 'Unassigned';
  const countryPortfolio = draft?.countryPreference?.firstChoiceCountry || 'No country selected';
  const eventName = selectedEvent?.name || 'No active event';
  const eventDate = selectedEvent ? formatDate(selectedEvent.date) : 'TBD';
  const ticketLabel =
    session?.status === 'success'
      ? `Ticket ${session.orderId.slice(-6).toUpperCase()}`
      : 'Waiting for payment';
  const certificateLabel =
    paymentStatus === 'complete' ? 'Ready for issuance' : 'Locked until attendance';

  const modules = [
    {
      title: 'Registration Status',
      value: isPaid ? 'Registered' : (draft?.personal?.fullName ? 'Registered' : 'Draft Saved'),
      subtitle: isPaid ? 'Application captured and secured.' : (draft?.personal?.email || 'Resume your application'),
      status: registrationStatus,
      icon: Users,
    },
    {
      title: 'Payment Status',
      value: isPaid ? 'Success' : 'Pending',
      subtitle: isPaid ? 'Confirmed in database' : 'No verified payment',
      status: paymentStatus,
      icon: CreditCard,
    },
    {
      title: 'Committee Allocation',
      value: committeeAllocation,
      subtitle: vaultStatus?.committeeName || selectedCommittee?.name || 'Awaiting allocation',
      status: committeeStatus,
      icon: LayoutPanelTop,
    },
    {
      title: 'Attendance Status',
      value: isCheckedIn ? 'Checked In' : (isAllocated ? 'Ready to Check In' : 'Locked'),
      subtitle: isCheckedIn ? 'Attendance verified' : (isAllocated ? 'Attendance lane enabled' : 'Complete allocation first'),
      status: attendanceStatus,
      icon: ShieldCheck,
    },
    {
      title: 'Certificate Status',
      value: certificateLabel,
      subtitle: paymentStatus === 'complete' ? 'Certificate pipeline active' : 'No certificate yet',
      status: certificateStatus,
      icon: Award,
    },
  ];

  const cards = [
    {
      title: 'Committee',
      description: 'Your assignment, agenda, and rank details at a glance.',
      icon: Landmark,
      content: selectedCommittee
        ? `${selectedCommittee.abbr} • ${selectedCommittee.name}`
        : draft?.committeePreference?.preferredCommitteeName ||
          'Choose a committee in the application flow.',
    },
    {
      title: 'Country Portfolio',
      description: 'The delegation you will represent in committee.',
      icon: Globe2,
      content: countryPortfolio,
    },
    {
      title: 'Event Information',
      description: 'The current event driving your delegate journey.',
      icon: CalendarDays,
      content: `${eventName} • ${eventDate}`,
    },
    {
      title: 'Announcements',
      description: 'Operational updates and reminders.',
      icon: BellRing,
      content:
        session?.status === 'success'
          ? 'Payment received. Proceed to check-in and allocation updates.'
          : 'Finish payment to unlock the next delegate milestones.',
    },
    {
      title: 'Ticket',
      description: 'Digital access artifact for the event.',
      icon: Ticket,
      content: ticketLabel,
    },
    {
      title: 'Certificate',
      description: 'Your final recognition badge.',
      icon: FileText,
      content: certificateLabel,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Diplomatic Command Center"
        subtitle="Premium delegate dashboard for registration, payment, allocation, attendance, and certification"
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/payments">
              Continue Payment
              <ChevronRight size={14} />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {committeesLoading || eventsLoading
          ? Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : modules.map((module) => (
              <MetricCard
                key={module.title}
                title={module.title}
                value={module.value}
                subtitle={module.subtitle}
                status={module.status}
                icon={module.icon}
              />
            ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-card overflow-hidden border-white/[0.08]">
          <CardHeader className="space-y-4 border-b border-white/[0.06] bg-white/[0.015]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardDescription className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Delegate Journey
                </CardDescription>
                <CardTitle className="mt-2 text-2xl text-foreground">Timeline</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Follow the lifecycle from registration through certification. Each stage unlocks
                  the next delegate action.
                </p>
              </div>
              <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold-400">Completion</p>
                <p className="mt-1 text-2xl font-semibold text-gold-300">{completionPercentage}%</p>
              </div>
            </div>
            <Progress value={completionPercentage} />
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-1">
              {timelineSteps.map((item, index) => (
                <TimelineStep
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  status={item.status}
                  last={index === timelineSteps.length - 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <LiveCommitteeFeed />

          <DataCard
            title="Quick Access"
            description="Fast actions for the delegate workspace."
            icon={Sparkles}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link to="/delegates">
                  <FileText size={14} /> Application
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link to="/payments">
                  <CreditCard size={14} /> Payments
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link to="/events">
                  <CalendarDays size={14} /> Events
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link to="/committees">
                  <Building2 size={14} /> Committees
                </Link>
              </Button>
            </div>
          </DataCard>

          <EventPaymentCard events={events} committees={committees} session={session ?? undefined} />
        </div>
      </div>

      {user && ['guest', 'delegate', 'organizer'].includes(user.role) && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RoleUpgradeCard />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <DataCard title={card.title} description={card.description} icon={card.icon}>
              <div className="flex min-h-24 items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-foreground">
                {card.content}
              </div>
            </DataCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
