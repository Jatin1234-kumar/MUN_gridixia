import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema, type ReviewData, type ApplicationDraft } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormCheckbox } from '../components/FormField';

interface Props {
  draft: ApplicationDraft;
  onNext: (data: ReviewData) => void;
  onBack: () => void;
  direction: 1 | -1;
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-foreground text-right">{value}</span>
    </div>
  );
}

export function ReviewStep({ draft, onNext, onBack, direction }: Props) {
  const { handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { agreeToCode: undefined, agreeToTerms: undefined },
  });

  const agreeToCode  = watch('agreeToCode');
  const agreeToTerms = watch('agreeToTerms');

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="Review & Confirm"
        subtitle="Check your details before proceeding to payment."
        stepNumber={6} totalSteps={7}
        onNext={handleSubmit(onNext)}
        onBack={onBack}
        nextLabel="Proceed to Payment"
        direction={direction}
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Personal</p>
          <ReviewRow label="Name"        value={`${draft.personal?.firstName ?? ''} ${draft.personal?.lastName ?? ''}`.trim()} />
          <ReviewRow label="Email"       value={draft.personal?.email} />
          <ReviewRow label="Nationality" value={draft.personal?.nationality} />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Academic</p>
          <ReviewRow label="Institution" value={draft.academic?.institution} />
          <ReviewRow label="Degree"      value={draft.academic?.degree} />
          <ReviewRow label="Field"       value={draft.academic?.fieldOfStudy} />
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Preferences</p>
          <ReviewRow label="Committee 1" value={draft.committeePref?.preference1} />
          <ReviewRow label="Country 1"   value={draft.countryPref?.preference1} />
          <ReviewRow label="Experience"  value={draft.experience?.munExperience} />
        </div>

        <div className="space-y-3 pt-2">
          <FormCheckbox
            label="I agree to the Code of Conduct and will conduct myself professionally throughout the conference."
            error={errors.agreeToCode?.message}
            checked={agreeToCode === true}
            onChange={(v) => setValue('agreeToCode', v as true, { shouldValidate: true })}
          />
          <FormCheckbox
            label="I agree to the Terms & Conditions and confirm all information provided is accurate."
            error={errors.agreeToTerms?.message}
            checked={agreeToTerms === true}
            onChange={(v) => setValue('agreeToTerms', v as true, { shouldValidate: true })}
          />
        </div>
      </StepShell>
    </form>
  );
}
