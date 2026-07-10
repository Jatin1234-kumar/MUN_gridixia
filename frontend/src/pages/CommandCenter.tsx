import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart3,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleDollarSign,
  LayoutList,
  Mail,
  MoreHorizontal,
  RefreshCcw,
  ScanLine,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/shared/Toast';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueTrendChart } from '@/components/charts/RevenueTrendChart';
import { RegistrationTrendChart } from '@/components/charts/RegistrationTrendChart';
import { CommitteeOccupancyChart } from '@/components/charts/CommitteeOccupancyChart';
import { AttendanceRateChart } from '@/components/charts/AttendanceRateChart';
import { cn, formatNumber } from '@/lib/utils';

// ─── Fallback chart data (no API endpoints yet) ─────────────────────────────

const revenueData = [
  { month: 'Jan', revenue: 240000, projected: undefined },
  { month: 'Feb', revenue: 480000, projected: undefined },
  { month: 'Mar', revenue: 720000, projected: undefined },
  { month: 'Apr', revenue: 960000, projected: undefined },
  { month: 'May', revenue: 1280000, projected: undefined },
  { month: 'Jun', revenue: 1560000, projected: undefined },
  { month: 'Jul', revenue: 1820000, projected: 1820000 },
  { month: 'Aug', revenue: 0, projected: 2100000 },
  { month: 'Sep', revenue: 0, projected: 2400000 },
];

const registrationData = [
  { week: 'W1', registrations: 180, cancellations: 12, cumulative: 180 },
  { week: 'W2', registrations: 240, cancellations: 18, cumulative: 402 },
  { week: 'W3', registrations: 310, cancellations: 22, cumulative: 690 },
  { week: 'W4', registrations: 195, cancellations: 15, cumulative: 870 },
  { week: 'W5', registrations: 150, cancellations: 8, cumulative: 1012 },
  { week: 'W6', registrations: 120, cancellations: 10, cumulative: 1122 },
  { week: 'W7', registrations: 98, cancellations: 6, cumulative: 1214 },
  { week: 'W8', registrations: 70, cancellations: 4, cumulative: 1280 },
];

const attendanceData = [
  { date: 'Day 1', rate: 92, target: 85 },
  { date: 'Day 2', rate: 88, target: 85 },
  { date: 'Day 3', rate: 85, target: 85 },
  { date: 'Day 4', rate: 82, target: 85 },
  { date: 'Day 5', rate: 87, target: 85 },
  { date: 'Day 6', rate: 90, target: 85 },
];

// ─── Activity Feed ──────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: 'registration' | 'payment' | 'checkin' | 'certificate' | 'allocation' | 'email';
  title: string;
  description: string;
  time: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'registration',
    title: 'New Registration',
    description: 'Priya Sharma registered for UNSC',
    time: '2 min ago',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Received',
    description: '₹4,500 from Arjun Mehta — UPI',
    time: '5 min ago',
  },
  {
    id: '3',
    type: 'checkin',
    title: 'Check-in Scanned',
    description: 'Delegate #1042 checked in at Gate A',
    time: '8 min ago',
  },
  {
    id: '4',
    type: 'certificate',
    title: 'Certificate Issued',
    description: 'Best Delegate — DISEC issued to Rhea Patel',
    time: '12 min ago',
  },
  {
    id: '5',
    type: 'allocation',
    title: 'Committee Assigned',
    description: 'Kabir Verma → UNHRC (Country: France)',
    time: '15 min ago',
  },
  {
    id: '6',
    type: 'email',
    title: 'Email Sent',
    description: 'Payment confirmation to 3 delegates',
    time: '18 min ago',
  },
  {
    id: '7',
    type: 'registration',
    title: 'New Registration',
    description: 'Ananya Reddy registered for ECOFIN',
    time: '22 min ago',
  },
  {
    id: '8',
    type: 'payment',
    title: 'Payment Failed',
    description: '₹3,200 from Dev Joshi — retry queued',
    time: '25 min ago',
  },
  {
    id: '9',
    type: 'checkin',
    title: 'Check-in Scanned',
    description: 'Delegate #1039 checked in at Gate B',
    time: '30 min ago',
  },
  {
    id: '10',
    type: 'certificate',
    title: 'Certificate Issued',
    description: 'Honourable Mention — UNEP issued to Meera Iyer',
    time: '33 min ago',
  },
];

const activityIcons: Record<ActivityItem['type'], typeof Users> = {
  registration: Users,
  payment: CircleDollarSign,
  checkin: ScanLine,
  certificate: Award,
  allocation: LayoutList,
  email: Mail,
};

const activityColors: Record<ActivityItem['type'], string> = {
  registration: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
  payment: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  checkin: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  certificate: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  allocation: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  email: 'text-muted-foreground bg-white/[0.04] border-white/[0.06]',
};

function ActivityFeedItem({ item, index }: { item: ActivityItem; index: number }) {
  const Icon = activityIcons[item.type];
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="flex items-start gap-3 group"
    >
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
          activityColors[item.type],
        )}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{item.time}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
    </motion.div>
  );
}

// ─── Chart Card Wrapper ─────────────────────────────────────────────────────

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: typeof BarChart3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('glass-card overflow-hidden border-white/[0.08]', className)}>
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

// ─── Operation Card ─────────────────────────────────────────────────────────

interface OperationCard {
  title: string;
  description: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  stat: string;
  statLabel: string;
  actions: Array<{ label: string; href: string }>;
}

function OperationCard({ op, index }: { op: OperationCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Card className="glass-card overflow-hidden border-white/[0.08] hover:border-gold-500/20 transition-all duration-300 h-full">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl border',
                op.bgColor,
              )}
            >
              <op.icon className={cn('h-4 w-4', op.color)} />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
              <MoreHorizontal size={14} />
            </Button>
          </div>
          <div>
            <CardTitle className="text-sm text-foreground">{op.title}</CardTitle>
            <CardDescription className="mt-1 text-xs leading-relaxed">
              {op.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-2xl font-bold text-foreground tabular-nums">{op.stat}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              {op.statLabel}
            </p>
          </div>
          <div className="flex gap-2">
            {op.actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                asChild
              >
                <Link to={action.href}>
                  {action.label}
                  <ChevronRight size={12} />
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

function QuickStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={14} className={color} />
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ─── Role Requests Panel ────────────────────────────────────────────────────

interface RoleRequest {
  id: string;
  userId: { id: string; firstName: string; lastName: string; email: string; role: string } | string;
  requestedRole: string;
  reason?: string;
  status: string;
  createdAt: string;
}

function RoleRequestsPanel() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function fetchRequests() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<{ data: RoleRequest[] }>('/auth/role-requests', { params: { status: 'pending' } });
      setRequests(data.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleAction(requestId: string, action: 'approved' | 'rejected') {
    setActionLoading(requestId + action);
    try {
      await api.patch(`/auth/role-requests/${requestId}`, { action });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <ChartCard title="Role Upgrade Requests" description="Pending requests from delegates and guests" icon={TrendingUp}>
      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      ) : error ? (
        <p className="text-xs text-red-400 py-4">{error}</p>
      ) : requests.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No pending role requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const user = typeof req.userId === 'object' ? req.userId : null;
            return (
              <div
                key={req.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user ? `${user.firstName} ${user.lastName}` : 'Unknown user'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email} &middot; currently <span className="text-gold-400">{user?.role ?? '—'}</span> &rarr; <span className="text-emerald-400">{req.requestedRole}</span>
                  </p>
                  {req.reason && (
                    <p className="mt-1 text-xs text-muted-foreground/70 italic">&ldquo;{req.reason}&rdquo;</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    disabled={!!actionLoading}
                    onClick={() => handleAction(req.id, 'approved')}
                  >
                    {actionLoading === req.id + 'approved' ? '…' : <Check size={13} />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                    disabled={!!actionLoading}
                    onClick={() => handleAction(req.id, 'rejected')}
                  >
                    {actionLoading === req.id + 'rejected' ? '…' : <X size={13} />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

export default function CommandCenter() {
  const [feedFilter, setFeedFilter] = useState<string>('all');
  const { toast } = useToast();
  const { data: stats, isLoading, refetch } = useDashboardStats();

  const filteredActivity =
    feedFilter === 'all'
      ? recentActivity
      : recentActivity.filter((item) => item.type === feedFilter);

  const handleRefresh = useCallback(() => {
    refetch();
    toast('Dashboard data refreshed.', 'success');
  }, [refetch, toast]);

  const handleExportReport = useCallback(() => {
    const headers = ['Type', 'Title', 'Description', 'Time'];
    const rows = recentActivity.map((item) => [item.type, item.title, item.description, item.time]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'command-center-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Report exported as CSV.', 'success');
  }, [toast]);

  const metrics = stats?.metrics;
  const committeeOccupancy = stats?.committeeOccupancy ?? [];

  const metricCards = metrics
    ? [
        {
          title: 'Total Delegates',
          value: formatNumber(metrics.totalDelegates),
          delta: `${metrics.confirmedDelegates} confirmed`,
          deltaType: 'positive' as const,
          icon: Users,
          iconColor: 'text-gold-400',
        },
        {
          title: 'Committees',
          value: formatNumber(metrics.totalCommittees),
          delta: `${metrics.activeEvents} active events`,
          deltaType: 'neutral' as const,
          icon: LayoutList,
          iconColor: 'text-blue-400',
        },
        {
          title: 'Occupancy',
          value: `${metrics.occupancyRate}%`,
          delta: `${formatNumber(metrics.filledSeats)} / ${formatNumber(metrics.totalCapacity)} seats`,
          deltaType: metrics.occupancyRate > 80 ? ('positive' as const) : ('neutral' as const),
          icon: CalendarCheck,
          iconColor: 'text-emerald-400',
        },
        {
          title: 'Pending',
          value: formatNumber(metrics.pendingDelegates),
          delta: `${metrics.waitlistedDelegates} waitlisted`,
          deltaType: metrics.pendingDelegates > 0 ? ('negative' as const) : ('neutral' as const),
          icon: ScanLine,
          iconColor: 'text-amber-400',
        },
      ]
    : [
        {
          title: 'Total Delegates',
          value: '—',
          delta: 'Loading...',
          deltaType: 'neutral' as const,
          icon: Users,
          iconColor: 'text-gold-400',
        },
        {
          title: 'Committees',
          value: '—',
          delta: 'Loading...',
          deltaType: 'neutral' as const,
          icon: LayoutList,
          iconColor: 'text-blue-400',
        },
        {
          title: 'Occupancy',
          value: '—',
          delta: 'Loading...',
          deltaType: 'neutral' as const,
          icon: CalendarCheck,
          iconColor: 'text-emerald-400',
        },
        {
          title: 'Pending',
          value: '—',
          delta: 'Loading...',
          deltaType: 'neutral' as const,
          icon: ScanLine,
          iconColor: 'text-amber-400',
        },
      ];

  const operations: OperationCard[] = [
    {
      title: 'Committee Allocation',
      description: 'Assign delegates to committees and manage country portfolios.',
      icon: LayoutList,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      stat: formatNumber(metrics?.pendingDelegates ?? 0),
      statLabel: 'Pending allocation',
      actions: [
        { label: 'Auto-allocate', href: '/country-allocation' },
        { label: 'View all', href: '/committees' },
      ],
    },
    {
      title: 'Attendance Monitoring',
      description: 'Track live check-ins, session attendance, and no-show rates.',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      stat: `${metrics?.occupancyRate ?? 0}%`,
      statLabel: 'Occupancy rate',
      actions: [
        { label: 'Open scanner', href: '/check-in' },
        { label: 'Export report', href: '/reports' },
      ],
    },
    {
      title: 'Payment Review',
      description: 'Monitor transactions, refunds, and payment gateway health.',
      icon: CircleDollarSign,
      color: 'text-gold-400',
      bgColor: 'bg-gold-500/10 border-gold-500/20',
      stat: formatNumber(metrics?.confirmedDelegates ?? 0),
      statLabel: 'Confirmed delegates',
      actions: [
        { label: 'Review pending', href: '/payments' },
        { label: 'Refund queue', href: '/payments' },
      ],
    },
    {
      title: 'Certificate Management',
      description: 'Generate, issue, and distribute achievement certificates.',
      icon: Award,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      stat: formatNumber(metrics?.totalDelegates ?? 0),
      statLabel: 'Total delegates',
      actions: [
        { label: 'Bulk generate', href: '/certificate-vault' },
        { label: 'View vault', href: '/certificate-vault' },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Conference Operations Command Center"
        subtitle="Real-time metrics, visualizations, operations, and activity monitoring"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button size="sm" onClick={handleExportReport}>
              <BarChart3 size={13} />
              Export Report
            </Button>
          </div>
        }
      />

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="glass-card border-white/[0.08]">
                <CardContent className="p-5">
                  <LoadingSpinner size="sm" />
                </CardContent>
              </Card>
            ))
          : metricCards.map((metric, i) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <StatCard {...metric} />
              </motion.div>
            ))}
      </div>

      {/* ── Visualizations ──────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trends"
          description="Monthly collection with forward projection"
          icon={CircleDollarSign}
        >
          <RevenueTrendChart data={revenueData} />
        </ChartCard>

        <ChartCard
          title="Registration Trends"
          description="Weekly registrations, cancellations, and cumulative"
          icon={Users}
        >
          <RegistrationTrendChart data={registrationData} />
        </ChartCard>

        <ChartCard
          title="Committee Occupancy"
          description="Delegates assigned vs capacity per committee"
          icon={LayoutList}
        >
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <CommitteeOccupancyChart data={committeeOccupancy} />
          )}
        </ChartCard>

        <ChartCard
          title="Attendance Rates"
          description="Daily check-in rates against 85% target"
          icon={CalendarCheck}
        >
          <AttendanceRateChart data={attendanceData} />
        </ChartCard>
      </div>

      {/* ── Operations + Activity ────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Operations Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Operations</h2>
              <p className="text-xs text-muted-foreground">Manage core conference workflows</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View all
              <ArrowUpRight size={12} />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {operations.map((op, i) => (
              <OperationCard key={op.title} op={op} index={i} />
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <Card className="glass-card overflow-hidden border-white/[0.08] h-fit">
          <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Recent Activity</CardTitle>
                  <CardDescription>Live feed of conference events</CardDescription>
                </div>
              </div>
              <div className="flex h-2 w-2">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>
            <Tabs value={feedFilter} onValueChange={setFeedFilter}>
              <TabsList className="w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="registration" title="Registrations">
                  Reg
                </TabsTrigger>
                <TabsTrigger value="payment" title="Payments">
                  Pay
                </TabsTrigger>
                <TabsTrigger value="checkin" title="Check-ins">
                  Check-in
                </TabsTrigger>
                <TabsTrigger value="certificate" title="Certificates">
                  Cert
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {filteredActivity.map((item, i) => (
                  <ActivityFeedItem key={item.id} item={item} index={i} />
                ))}
              </AnimatePresence>
              {filteredActivity.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No activity matching this filter</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Role Requests ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RoleRequestsPanel />
      </div>

      {/* ── Quick Stats Bar ─────────────────────────────────────────────── */}
      <Card className="glass-card overflow-hidden border-white/[0.08]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <QuickStat
                icon={Zap}
                label="Queue Health"
                value="All Clear"
                color="text-emerald-400"
              />
              <QuickStat
                icon={Users}
                label="Delegates"
                value={formatNumber(metrics?.totalDelegates ?? 0)}
                color="text-gold-400"
              />
              <QuickStat
                icon={LayoutList}
                label="Committees"
                value={formatNumber(metrics?.totalCommittees ?? 0)}
                color="text-blue-400"
              />
              <QuickStat
                icon={CalendarCheck}
                label="Occupancy"
                value={`${metrics?.occupancyRate ?? 0}%`}
                color="text-emerald-400"
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Last sync: {isLoading ? 'updating...' : 'just now'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
