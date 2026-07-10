import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { countryPreferenceSchema, type CountryPrefData } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormInput, FormTextarea } from '../components/FormField';

interface Props {
  defaultValues?: Partial<CountryPrefData>;
  onNext: (data: CountryPrefData) => void;
  onBack: () => void;
  savedAt?: string;
  direction: 1 | -1;
}

export function CountryStep({ defaultValues, onNext, onBack, savedAt, direction }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<CountryPrefData>({
    resolver: zodResolver(countryPreferenceSchema),
    defaultValues: defaultValues ?? {},
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="Country Preference"
        subtitle="Which country would you like to represent? List in order of preference."
        stepNumber={5} totalSteps={7}
        onNext={handleSubmit(onNext)}
        onBack={onBack}
        isSaved={Boolean(defaultValues)} savedAt={savedAt}
        direction={direction}
      >
        <FormInput
          label="1st Choice Country" required
          error={errors.preference1?.message}
          {...register('preference1')}
          placeholder="e.g. India, Germany, Brazil"
        />
        <FormInput
          label="2nd Choice Country"
          error={errors.preference2?.message}
          {...register('preference2')}
          placeholder="Optional"
        />
        <FormInput
          label="3rd Choice Country"
          error={errors.preference3?.message}
          {...register('preference3')}
          placeholder="Optional"
        />
        <FormTextarea
          label="Prior Research on Country" required
          error={errors.priorResearch?.message}
          {...register('priorResearch')}
          placeholder="Briefly describe your knowledge of your first choice country's position (min 20 characters)"
        />
      </StepShell>
    </form>
  );
}
