import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { committeePreferenceSchema, type CommitteePrefData } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormInput, FormTextarea } from '../components/FormField';

interface Props {
  eventId: string;
  defaultValues?: Partial<CommitteePrefData>;
  onNext: (data: CommitteePrefData) => void;
  onBack: () => void;
  savedAt?: string;
  direction: 1 | -1;
}

export function CommitteeStep({ defaultValues, onNext, onBack, savedAt, direction }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<CommitteePrefData>({
    resolver: zodResolver(committeePreferenceSchema),
    defaultValues: defaultValues ?? {},
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="Committee Preference"
        subtitle="Enter your preferred committees in order of preference."
        stepNumber={4} totalSteps={7}
        onNext={handleSubmit(onNext)}
        onBack={onBack}
        isSaved={Boolean(defaultValues)} savedAt={savedAt}
        direction={direction}
      >
        <FormInput
          label="1st Choice Committee" required
          error={errors.preference1?.message}
          {...register('preference1')}
          placeholder="e.g. UNSC, UNHRC, DISEC"
        />
        <FormInput
          label="2nd Choice Committee"
          error={errors.preference2?.message}
          {...register('preference2')}
          placeholder="Optional"
        />
        <FormInput
          label="3rd Choice Committee"
          error={errors.preference3?.message}
          {...register('preference3')}
          placeholder="Optional"
        />
        <FormTextarea
          label="Why this committee?" required
          error={errors.whyThisCommittee?.message}
          {...register('whyThisCommittee')}
          placeholder="Explain your interest in your first choice committee (min 30 characters)"
        />
      </StepShell>
    </form>
  );
}
