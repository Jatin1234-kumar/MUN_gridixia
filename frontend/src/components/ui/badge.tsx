import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-gold-500/15 text-gold-400 border-gold-500/30',
        active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
        inactive:  'bg-white/5 text-muted-foreground border-white/10',
        urgent:    'bg-red-500/15 text-red-400 border-red-500/30',
        mun:       'bg-blue-500/15 text-blue-400 border-blue-500/30',
        parliament:'bg-purple-500/15 text-purple-400 border-purple-500/30',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
