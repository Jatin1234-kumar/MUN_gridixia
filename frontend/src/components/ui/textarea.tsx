import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-2 text-sm text-foreground shadow-sm',
      'placeholder:text-muted-foreground/50',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/40',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors duration-200',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
