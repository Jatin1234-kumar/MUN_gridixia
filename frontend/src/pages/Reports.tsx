import { FileText, TrendingUp, Users, Award, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RegistrationChart } from '@/components/charts/RegistrationChart';
import { CommitteeDistribution } from '@/components/charts/CommitteeDistribution';

const registrationData = [
  { month: 'Jan', delegates: 42, chairs: 8 },
  { month: 'Feb', delegates: 88, chairs: 14 },
  { month: 'Mar', delegates: 130, chairs: 20 },
  { month: 'Apr', delegates: 175, chairs: 26 },
  { month: 'May', delegates: 210, chairs: 31 },
  { month: 'Jun', delegates: 268, chairs: 38 },
];

const committeeData = [
  { name: 'UNSC', value: 15, color: '#c9a20d' },
  { name: 'GA1', value: 22, color: '#3b82f6' },
  { name: 'ECOSOC', value: 18, color: '#8b5cf6' },
  { name: 'HRC', value: 20, color: '#10b981' },
  { name: 'WHA', value: 12, color: '#f97316' },
];

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof FileText;
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

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Analytics and participation metrics"
        actions={
          <Button size="sm" variant="outline">
            <Download size={13} />
            Export
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Registrations', value: '268', icon: Users, color: 'text-blue-400' },
          { label: 'Revenue Collected', value: '₹18.6L', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Certificates Issued', value: '245', icon: Award, color: 'text-purple-400' },
          { label: 'Active Committees', value: '5', icon: FileText, color: 'text-gold-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="data-label">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] ${stat.color}`}>
                <stat.icon size={18} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Registration Trend" description="Monthly delegate and chair registrations" icon={TrendingUp}>
          <RegistrationChart data={registrationData} />
        </ChartCard>

        <ChartCard title="Committee Breakdown" description="Delegates distributed across committees" icon={Users}>
          <CommitteeDistribution data={committeeData} />
        </ChartCard>
      </div>
    </div>
  );
}
