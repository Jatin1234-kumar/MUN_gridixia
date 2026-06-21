import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  delta,
  deltaType = 'neutral',
  icon: Icon,
  iconColor = 'text-gold-400',
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('stat-card group', className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="data-label">{title}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {delta && (
            <p
              className={cn('text-xs font-medium', {
                'text-emerald-400': deltaType === 'positive',
                'text-red-400': deltaType === 'negative',
                'text-muted-foreground': deltaType === 'neutral',
              })}
            >
              {delta}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] group-hover:border-gold-500/20 transition-colors', iconColor)}>
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}
