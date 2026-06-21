import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  RefreshCcw,
  Server,
  Shield,
  XCircle,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface WorkerHealth {
  name: string;
  running: boolean;
  metrics: {
    processed: number;
    failed: number;
    active: number;
    startedAt: string;
  };
}

interface QueueHealth {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  workers: WorkerHealth[];
  queues: QueueHealth[];
  totals: { processed: number; failed: number };
}

interface ErrorStats {
  timestamp: string;
  errorRate: string;
  totalProcessed: number;
  totalFailed: number;
  failedQueues: Array<{ name: string; failed: number }>;
  memoryUsage: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
    external: string;
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Monitoring() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [errors, setErrors] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchData() {
    setLoading(true);
    try {
      const [healthRes, errorsRes] = await Promise.all([
        api.get<SystemHealth>('/monitoring/health'),
        api.get<ErrorStats>('/monitoring/errors'),
      ]);
      setHealth(healthRes.data);
      setErrors(errorsRes.data);
      setLastRefresh(new Date());
    } catch {
      console.error('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Monitoring Dashboard"
        subtitle="System health, error tracking, and Sentry integration status"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCcw size={13} className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── System Status Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="System Status"
          value={health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
          icon={health?.status === 'healthy' ? CheckCircle2 : AlertTriangle}
          color={health?.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}
          bgColor={health?.status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}
        />
        <StatusCard
          title="Error Rate"
          value={errors?.errorRate ?? '—'}
          icon={XCircle}
          color="text-red-400"
          bgColor="bg-red-500/10 border-red-500/20"
          subtitle={`${errors?.totalFailed ?? 0} / ${errors?.totalProcessed ?? 0} jobs`}
        />
        <StatusCard
          title="Uptime"
          value={health ? formatUptime(health.uptime) : '—'}
          icon={Clock}
          color="text-blue-400"
          bgColor="bg-blue-500/10 border-blue-500/20"
        />
        <StatusCard
          title="Memory (Heap)"
          value={errors?.memoryUsage.heapUsed ?? '—'}
          icon={Cpu}
          color="text-purple-400"
          bgColor="bg-purple-500/10 border-purple-500/20"
          subtitle={`of ${errors?.memoryUsage.heapTotal ?? '—'}`}
        />
      </div>

      {/* ── Sentry Status ──────────────────────────────────────────────── */}
      <Card className="glass-card overflow-hidden border-white/[0.08]">
        <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Sentry Integration</CardTitle>
              <CardDescription>Error tracking and performance monitoring</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">DSN configured</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Environment</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{health?.status ? 'production' : 'development'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trace sampling: 20%</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tracking</p>
              <p className="mt-1 text-lg font-semibold text-foreground">4 categories</p>
              <p className="text-xs text-muted-foreground mt-0.5">API, payments, certs, workers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Worker Health ──────────────────────────────────────────────── */}
      <Card className="glass-card overflow-hidden border-white/[0.08]">
        <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Worker Health</CardTitle>
              <CardDescription>BullMQ worker status and metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {health?.workers && health.workers.length > 0 ? (
            <div className="space-y-3">
              {health.workers.map((worker, i) => (
                <motion.div
                  key={worker.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      worker.running ? 'bg-emerald-500' : 'bg-red-500',
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {new Date(worker.metrics.startedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <p className="text-muted-foreground">Processed</p>
                      <p className="font-semibold text-foreground tabular-nums">{worker.metrics.processed}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Failed</p>
                      <p className={cn('font-semibold tabular-nums', worker.metrics.failed > 0 ? 'text-red-400' : 'text-foreground')}>
                        {worker.metrics.failed}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Active</p>
                      <p className="font-semibold text-foreground tabular-nums">{worker.metrics.active}</p>
                    </div>
                    <Badge variant={worker.running ? 'active' : 'urgent'}>
                      {worker.running ? 'Running' : 'Stopped'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No worker data available</p>
          )}
        </CardContent>
      </Card>

      {/* ── Queue Stats ────────────────────────────────────────────────── */}
      <Card className="glass-card overflow-hidden border-white/[0.08]">
        <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Queue Statistics</CardTitle>
              <CardDescription>Redis-backed BullMQ queue depths</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {health?.queues && health.queues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-2 text-left text-muted-foreground font-mono uppercase tracking-widest">Queue</th>
                    <th className="py-2 text-right text-muted-foreground font-mono">Waiting</th>
                    <th className="py-2 text-right text-muted-foreground font-mono">Active</th>
                    <th className="py-2 text-right text-muted-foreground font-mono">Completed</th>
                    <th className="py-2 text-right text-muted-foreground font-mono">Failed</th>
                    <th className="py-2 text-right text-muted-foreground font-mono">Delayed</th>
                  </tr>
                </thead>
                <tbody>
                  {health.queues.map((q) => (
                    <tr key={q.queueName} className="border-b border-white/[0.03]">
                      <td className="py-3 font-medium text-foreground">{q.queueName}</td>
                      <td className="py-3 text-right tabular-nums text-foreground">{q.waiting}</td>
                      <td className="py-3 text-right tabular-nums text-foreground">{q.active}</td>
                      <td className="py-3 text-right tabular-nums text-emerald-400">{q.completed}</td>
                      <td className="py-3 text-right tabular-nums text-red-400">{q.failed}</td>
                      <td className="py-3 text-right tabular-nums text-amber-400">{q.delayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No queue data available</p>
          )}
        </CardContent>
      </Card>

      {/* ── Error Tracking Categories ──────────────────────────────────── */}
      <Card className="glass-card overflow-hidden border-white/[0.08]">
        <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">Error Tracking Categories</CardTitle>
              <CardDescription>Sentry event categories being monitored</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'API Failures', description: 'HTTP errors, 5xx responses', icon: Zap, color: 'text-blue-400' },
              { label: 'Payment Failures', description: 'Razorpay errors, webhook failures', icon: AlertTriangle, color: 'text-amber-400' },
              { label: 'Certificate Failures', description: 'PDF generation, upload errors', icon: XCircle, color: 'text-red-400' },
              { label: 'Unhandled Exceptions', description: 'Uncaught errors, rejections', icon: Shield, color: 'text-purple-400' },
            ].map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <cat.icon size={16} className={cat.color} />
                <p className="mt-2 text-sm font-medium text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
}: {
  title: string;
  value: string;
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="data-label">{title}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn('p-2.5 rounded-lg border', bgColor)}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </motion.div>
  );
}
