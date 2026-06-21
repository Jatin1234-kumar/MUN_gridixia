import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepShellProps {
  title:        string;
  subtitle:     string;
  stepNumber:   number;
  totalSteps:   number;
  children:     ReactNode;
  onBack?:      () => void;
  onNext:       () => void;
  nextLabel?:   string;
  isSubmitting?: boolean;
  isSaved?:     boolean;
  savedAt?:     string;
  direction:    1 | -1;
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export function StepShell({
  title, subtitle, stepNumber, totalSteps, children,
  onBack, onNext, nextLabel = 'Continue', isSubmitting, isSaved, savedAt, direction,
}: StepShellProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepNumber}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-1 min-w-0"
      >
        <div className="glass-card rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="mb-6 pb-5 border-b border-white/[0.06] flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono text-gold-500/70 uppercase tracking-widest mb-1">
                Step {stepNumber} of {totalSteps}
              </p>
              <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
            {/* Autosave indicator */}
            <div className={cn(
              'flex items-center gap-1.5 text-[11px] font-mono shrink-0 transition-opacity duration-300',
              isSaved ? 'text-emerald-400/70 opacity-100' : 'opacity-0',
            )}>
              <Save size={11} />
              {savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}
            </div>
          </div>

          {/* Form content */}
          <div className="space-y-5">{children}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={!onBack}
              className={cn(!onBack && 'invisible')}
            >
              <ChevronLeft size={15} />
              Back
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onNext}
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <><Loader2 size={14} className="animate-spin" /> Processing…</>
              ) : (
                <>{nextLabel}<ChevronRight size={15} /></>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
