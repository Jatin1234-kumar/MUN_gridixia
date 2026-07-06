import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienceSchema, type ExperienceData } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormInput, FormSelect, FormTextarea } from '../components/FormField';

const EXPERIENCE_OPTIONS = [
  { value: 'none',         label: 'No experience' },
  { value: 'beginner',     label: 'Beginner (1–2 conferences)' },
  { value: 'intermediate', label: 'Intermediate (3–5 conferences)' },
  { value: 'advanced',     label: 'Advanced (6+ conferences)' },
];

interface Props {
  defaultValues?: Partial<ExperienceData>;
  onNext: (data: ExperienceData) => void;
  onBack: () => void;
  savedAt?: string;
  direction: 1 | -1;
}

export function ExperienceStep({ defaultValues, onNext, onBack, savedAt, direction }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<ExperienceData>({
    resolver: zodResolver(experienceSchema),
    defaultValues: defaultValues ?? {},
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="MUN Experience"
        subtitle="Share your Model UN background so we can place you appropriately."
        stepNumber={3} totalSteps={7}
        onNext={handleSubmit(onNext)}
        onBack={onBack}
        isSaved={Boolean(defaultValues)} savedAt={savedAt}
        direction={direction}
      >
        <FormSelect
          label="MUN Experience Level" required
          error={errors.munExperience?.message}
          options={EXPERIENCE_OPTIONS}
          placeholder="Select level"
          {...register('munExperience')}
        />
        <FormInput
          label="Number of Conferences Attended" required type="number" min={0} max={100}
          error={errors.conferencesAttended?.message}
          {...register('conferencesAttended')}
          placeholder="0"
        />
        <FormTextarea
          label="Positions Held"
          error={errors.positionsHeld?.message}
          {...register('positionsHeld')}
          placeholder="e.g. Chair, Deputy Chair, Best Delegate… (optional)"
        />
        <FormTextarea
          label="Awards & Achievements"
          error={errors.awards?.message}
          {...register('awards')}
          placeholder="List any awards you've received (optional)"
        />
        <FormTextarea
          label="Motivation Statement" required
          error={errors.motivationStatement?.message}
          {...register('motivationStatement')}
          placeholder="Why do you want to participate in this conference? (min 50 characters)"
        />
      </StepShell>
    </form>
  );
}
