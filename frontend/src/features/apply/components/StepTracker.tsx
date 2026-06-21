import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPS } from '../apply.schemas';

interface StepTrackerProps {
  currentStep:    number;
  completedSteps: number[];
  onStepClick:    (index: number) => void;
}

export function StepTracker({ currentStep, completedSteps, onStepClick }: StepTrackerProps) {
  return (
    <>
      {/* Desktop — vertical sidebar */}
      <nav className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.index);
          const isActive    = currentStep === step.index;
          const isAccessible = isCompleted || step.index <= (Math.max(...completedSteps, -1) + 1);

          return (
            <button
              key={step.id}
              onClick={() => isAccessible && onStepClick(step.index)}
              disabled={!isAccessible}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200',
                isActive    && 'bg-gold-500/10 border border-gold-500/30 text-gold-400',
                isCompleted && !isActive && 'text-emerald-400 hover:bg-white/[0.04] cursor-pointer',
                !isActive && !isCompleted && isAccessible  && 'text-muted-foreground hover:bg-white/[0.04] cursor-pointer',
                !isAccessible && 'text-muted-foreground/30 cursor-not-allowed',
              )}
            >
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all',
                isActive    && 'bg-gold-500 border-gold-500 text-navy-950',
                isCompleted && !isActive && 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
                !isActive && !isCompleted && 'border-white/10 text-muted-foreground',
              )}>
                {isCompleted && !isActive ? <Check size={10} /> : step.index + 1}
              </span>
              <span className="font-medium leading-tight">{step.shortLabel}</span>
              {isActive && (
                <motion.div
                  layoutId="step-indicator"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile — horizontal dots */}
      <div className="lg:hidden w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-mono">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-xs text-gold-400 font-medium">{STEPS[currentStep]?.label}</span>
        </div>
        <div className="flex gap-1.5 h-1">
          {STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.index);
            const isActive    = currentStep === step.index;
            return (
              <motion.div
                key={step.id}
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  isActive    ? 'bg-gold-500 flex-[2]' : '',
                  isCompleted && !isActive ? 'bg-emerald-500/60 flex-1' : '',
                  !isActive && !isCompleted ? 'bg-white/10 flex-1' : '',
                )}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
