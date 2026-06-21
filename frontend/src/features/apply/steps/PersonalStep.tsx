import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalSchema, type PersonalData } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormInput, FormSelect } from '../components/FormField';

const GENDER_OPTIONS = [
  { value: 'male',              label: 'Male' },
  { value: 'female',            label: 'Female' },
  { value: 'non_binary',        label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

interface Props {
  defaultValues?: Partial<PersonalData>;
  onNext: (data: PersonalData) => void;
  savedAt?: string;
  direction: 1 | -1;
}

export function PersonalStep({ defaultValues, onNext, savedAt, direction }: Props) {
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    defaultValues: defaultValues ?? {},
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="Personal Information"
        subtitle="Tell us about yourself. This information will appear on your delegate credentials."
        stepNumber={1} totalSteps={7}
        onNext={handleSubmit(onNext)}
        isSaved={Boolean(defaultValues)} savedAt={savedAt}
        direction={direction}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="First Name" required error={errors.firstName?.message}
            {...register('firstName')} placeholder="Jane" />
          <FormInput label="Last Name" required error={errors.lastName?.message}
            {...register('lastName')} placeholder="Smith" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Email Address" required type="email" error={errors.email?.message}
            {...register('email')} placeholder="jane@university.edu" />
          <FormInput label="Phone Number" required type="tel" error={errors.phone?.message}
            {...register('phone')} placeholder="+1 555 0100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Date of Birth" required type="date" error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')} />
          <FormInput label="Nationality" required error={errors.nationality?.message}
            {...register('nationality')} placeholder="American" />
        </div>
        <FormSelect
          label="Gender" required
          error={errors.gender?.message}
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          {...register('gender')}
        />
      </StepShell>
    </form>
  );
}
