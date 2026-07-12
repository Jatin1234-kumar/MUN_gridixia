import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Globe2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDraft } from '@/features/apply/apply.store';
import { useSubmitApplication } from '@/features/apply/apply.service';
import { STEPS } from '@/features/apply/apply.schemas';
import { StepTracker } from '@/features/apply/components/StepTracker';
import { PersonalStep } from '@/features/apply/steps/PersonalStep';
import { AcademicStep } from '@/features/apply/steps/AcademicStep';
import { useAuth } from '@/features/auth/AuthContext';
import type {
  PersonalData,
  AcademicData,
  ExperienceData,
  CommitteePrefData,
  CountryPrefData,
  ReviewData,
  PaymentData,
} from '@/features/apply/apply.schemas';

// Lazy-load the heavier steps to keep initial bundle small
import { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/shared/LoadingSpinner';

const ExperienceStep    = lazy(() => import('@/features/apply/steps/ExperienceStep').then(m => ({ default: m.ExperienceStep })));
const CommitteeStep     = lazy(() => import('@/features/apply/steps/CommitteeStep').then(m => ({ default: m.CommitteeStep })));
const CountryStep       = lazy(() => import('@/features/apply/steps/CountryStep').then(m => ({ default: m.CountryStep })));
const ReviewStep        = lazy(() => import('@/features/apply/steps/ReviewStep').then(m => ({ default: m.ReviewStep })));
const PaymentStep       = lazy(() => import('@/features/apply/steps/PaymentStep').then(m => ({ default: m.PaymentStep })));

export default function Apply() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = eventId ?? '';
  const userId = user?.id ?? 'anonymous';

  const { draft, saveStepData, goToStep, clearDraft } = useDraft(userId, id);
  const submitApplication = useSubmitApplication();
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitted, setSubmitted] = useState(false);

  function next(step: number) {
    setDirection(1);
    goToStep(step);
  }

  function back(step: number) {
    setDirection(-1);
    goToStep(step);
  }

  async function handleSubmit() {
    if (
      !draft.personal || !draft.academic || !draft.experience ||
      !draft.committeePref || !draft.countryPref || !draft.payment
    ) return;

    await submitApplication.mutateAsync({
      eventId: id,
      personal:      draft.personal      as PersonalData,
      academic:      draft.academic      as AcademicData,
      experience:    draft.experience    as ExperienceData,
      committeePref: draft.committeePref as CommitteePrefData,
      countryPref:   draft.countryPref   as CountryPrefData,
      payment:       draft.payment       as PaymentData,
    });

    clearDraft();
    setSubmitted(true);
  }

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">No event specified.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card gold-border rounded-2xl p-10 max-w-md w-full text-center space-y-4"
        >
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Application Submitted!</h1>
          <p className="text-sm text-muted-foreground">
            Your application has been received. You'll get a confirmation email shortly.
          </p>
          <button
            onClick={() => navigate('/events')}
            className="mt-2 text-sm text-gold-400 hover:text-gold-300 transition-colors"
          >
            Back to Events
          </button>
        </motion.div>
      </div>
    );
  }

  const step = draft.currentStep;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/15 border border-gold-500/30">
            <Globe2 size={16} className="text-gold-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">MUN Gridixia</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">DELEGATE APPLICATION</p>
          </div>
        </div>

        {/* Mobile step tracker */}
        <div className="mb-6 lg:hidden">
          <StepTracker
            currentStep={step}
            completedSteps={draft.completedSteps}
            onStepClick={(i) => { setDirection(i > step ? 1 : -1); goToStep(i); }}
          />
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <StepTracker
              currentStep={step}
              completedSteps={draft.completedSteps}
              onStepClick={(i) => { setDirection(i > step ? 1 : -1); goToStep(i); }}
            />
          </div>

          {/* Step content */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<PageLoader />}>
              {step === 0 && (
                <PersonalStep
                  defaultValues={draft.personal}
                  emailFallback={user?.email}
                  savedAt={draft.savedAt}
                  direction={direction}
                  onNext={(data: PersonalData) => { saveStepData('personal', data); next(1); }}
                />
              )}
              {step === 1 && (
                <AcademicStep
                  defaultValues={draft.academic}
                  savedAt={draft.savedAt}
                  direction={direction}
                  onNext={(data: AcademicData) => { saveStepData('academic', data); next(2); }}
                  onBack={() => back(0)}
                />
              )}
              {step === 2 && (
                <ExperienceStep
                  defaultValues={draft.experience}
                  savedAt={draft.savedAt}
                  direction={direction}
                  onNext={(data: ExperienceData) => { saveStepData('experience', data); next(3); }}
                  onBack={() => back(1)}
                />
              )}
              {step === 3 && (
                <CommitteeStep
                  eventId={id}
                  defaultValues={draft.committeePref}
                  savedAt={draft.savedAt}
                  direction={direction}
                  onNext={(data: CommitteePrefData) => { saveStepData('committeePref', data); next(4); }}
                  onBack={() => back(2)}
                />
              )}
              {step === 4 && (
                <CountryStep
                  defaultValues={draft.countryPref}
                  savedAt={draft.savedAt}
                  direction={direction}
                  onNext={(data: CountryPrefData) => { saveStepData('countryPref', data); next(5); }}
                  onBack={() => back(3)}
                />
              )}
              {step === 5 && (
                <ReviewStep
                  draft={draft}
                  direction={direction}
                  onNext={(data: ReviewData) => { saveStepData('review', data); next(6); }}
                  onBack={() => back(4)}
                />
              )}
              {step === 6 && (
                <PaymentStep
                  draft={draft}
                  direction={direction}
                  isSubmitting={submitApplication.isPending}
                  onNext={(data: PaymentData) => { saveStepData('payment', data); handleSubmit(); }}
                  onBack={() => back(5)}
                />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
