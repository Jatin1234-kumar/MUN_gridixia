import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
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
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LiveCommitteeFeed } from '@/features/dashboard/LiveCommitteeFeed';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import { useSeo, PAGE_SEO } from '@/lib/seo';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { readJson } from '@/lib/storage';
import type { Committee, DelegateApplicationDraft, Event, PaymentSession } from '@/types';

const delegateDraftKey = 'mun-gridixia:delegate-application-draft:v1';
const paymentSessionKey = 'mun-gridixia:payment-session:v1';

type DashboardStatus = 'complete' | 'in-progress' | 'pending' | 'attention';

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
  const { data: committees = [], isLoading: committeesLoading } = useCommittees();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const [draft, setDraft] = useState<Partial<DelegateApplicationDraft> | undefined>(undefined);
  const [session, setSession] = useState<PaymentSession | undefined>(undefined);

  useEffect(() => {
    setDraft(readJson<DelegateApplicationDraft>(delegateDraftKey));
    setSession(readJson<PaymentSession>(paymentSessionKey));
  }, []);

  const selectedCommittee = useMemo(() => {
    const committeeId = draft?.committeePreference?.preferredCommitteeId ?? session?.committeeId;
    return committees.find((committee: Committee) => committee.id === committeeId);
  }, [committees, draft, session]);

  const selectedEvent = useMemo(() => {
    const eventId = selectedCommittee?.eventId ?? session?.eventId;
    return events.find((event: Event) => event.id === eventId);
  }, [events, selectedCommittee, session]);

  const registrationStatus: DashboardStatus = draft?.personal?.fullName ? 'complete' : 'in-progress';
  const paymentStatus: DashboardStatus =
    session?.status === 'success'
      ? 'complete'
      : session?.status === 'failed'
        ? 'attention'
        : session?.status === 'processing'
          ? 'in-progress'
          : 'pending';
  const committeeStatus: DashboardStatus = selectedCommittee ? 'complete' : 'pending';
  const attendanceStatus: DashboardStatus =
    paymentStatus === 'complete' && selectedEvent ? 'in-progress' : 'pending';
  const certificateStatus: DashboardStatus = paymentStatus === 'complete' ? 'pending' : 'pending';

  const timeline = [
    {
      title: 'Registered',
      subtitle: draft?.personal?.fullName
        ? 'Application draft completed'
        : 'Waiting for application completion',
      status: registrationStatus,
    },
    {
      title: 'Paid',
      subtitle: session?.status ? `Payment ${session.status}` : 'Awaiting payment',
      status: paymentStatus,
    },
    {
      title: 'Allocated',
      subtitle: selectedCommittee
        ? `${selectedCommittee.abbr} - ${selectedCommittee.name}`
        : 'Committee not yet assigned',
      status: committeeStatus,
    },
    {
      title: 'Checked In',
      subtitle: 'Attendance will unlock after payment and allocation',
      status: attendanceStatus,
    },
    {
      title: 'Certified',
      subtitle: 'Certificate will issue after attendance verification',
      status: certificateStatus,
    },
  ];

  const committeeAllocation = selectedCommittee
    ? `${selectedCommittee.abbr}`
    : draft?.committeePreference?.preferredCommitteeName || 'Unassigned';
  const countryPortfolio = draft?.countryPreference?.firstChoiceCountry || 'No country selected';
  const eventName = selectedEvent?.name || 'No active event';
  const eventDate = selectedEvent ? formatDate(selectedEvent.date) : 'TBD';
  const receipt = session?.receiptId || 'Pending';
  const ticketLabel =
    session?.status === 'success'
      ? `Ticket ${session.orderId.slice(-6).toUpperCase()}`
      : 'Waiting for payment';
  const certificateLabel =
    paymentStatus === 'complete' ? 'Ready for issuance' : 'Locked until attendance';

  const modules = [
    {
      title: 'Registration Status',
      value: draft?.personal?.fullName ? 'Registered' : 'Draft Saved',
      subtitle: draft?.personal?.email || 'Resume your application',
      status: registrationStatus,
      icon: Users,
    },
    {
      title: 'Payment Status',
      value: session?.status
        ? session.status.charAt(0).toUpperCase() + session.status.slice(1)
        : 'Pending',
      subtitle: session?.orderId ? `Order ${session.orderId}` : 'No active order',
      status: paymentStatus,
      icon: CreditCard,
    },
    {
      title: 'Committee Allocation',
      value: committeeAllocation,
      subtitle: selectedCommittee?.name || 'Awaiting allocation',
      status: committeeStatus,
      icon: LayoutPanelTop,
    },
    {
      title: 'Attendance Status',
      value: paymentStatus === 'complete' ? 'Ready to Check In' : 'Locked',
      subtitle: paymentStatus === 'complete' ? 'Attendance lane enabled' : 'Complete payment first',
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

  const completion = [
    registrationStatus,
    paymentStatus,
    committeeStatus,
    attendanceStatus,
    certificateStatus,
  ].filter((status) => status === 'complete').length;
  const progress = (completion / 5) * 100;

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
                <p className="mt-1 text-2xl font-semibold text-gold-300">{Math.round(progress)}%</p>
              </div>
            </div>
            <Progress value={progress} />
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-1">
              {timeline.map((item, index) => (
                <TimelineStep
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  status={item.status}
                  last={index === timeline.length - 1}
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

          <DataCard
            title="Snapshot"
            description="Current state pulled from the application and payment session."
            icon={QrCode}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Receipt
                  </p>
                  <p className="mt-1 text-sm text-foreground">{receipt}</p>
                </div>
                <Wallet className="h-5 w-5 text-gold-400" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Country Portfolio
                  </p>
                  <p className="mt-1 text-sm text-foreground">{countryPortfolio}</p>
                </div>
                <MapPin className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Delegate Count
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedCommittee ? formatNumber(selectedCommittee.delegates ?? 0) : '0'}
                  </p>
                </div>
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </DataCard>
        </div>
      </div>

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
