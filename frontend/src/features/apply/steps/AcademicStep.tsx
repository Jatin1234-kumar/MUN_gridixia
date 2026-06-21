import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { academicSchema, type AcademicData } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormInput } from '../components/FormField';

interface Props {
  defaultValues?: Partial<AcademicData>;
  onNext: (data: AcademicData) => void;
  onBack: () => void;
  savedAt?: string;
  direction: 1 | -1;
}

export function AcademicStep({ defaultValues, onNext, onBack, savedAt, direction }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<AcademicData>({
    resolver: zodResolver(academicSchema),
    defaultValues: defaultValues ?? {},
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="Academic Information"
        subtitle="Your academic background helps us place you in the right committee."
        stepNumber={2} totalSteps={7}
        onNext={handleSubmit(onNext)}
        onBack={onBack}
        isSaved={Boolean(defaultValues)} savedAt={savedAt}
        direction={direction}
      >
        <FormInput label="Institution / University" required error={errors.institution?.message}
          {...register('institution')} placeholder="Harvard University" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Degree Programme" required error={errors.degree?.message}
            {...register('degree')} placeholder="Bachelor of Arts" />
          <FormInput label="Field of Study" required error={errors.fieldOfStudy?.message}
            {...register('fieldOfStudy')} placeholder="Political Science" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Current Year of Study" required type="number" min={1} max={8}
            error={errors.yearOfStudy?.message}
            {...register('yearOfStudy')} placeholder="2" />
          <FormInput label="Expected Graduation Year" required type="number" min={2024} max={2035}
            error={errors.graduationYear?.message}
            {...register('graduationYear')} placeholder="2026" />
        </div>
        <FormInput label="GPA / Grade" error={errors.gpa?.message}
          {...register('gpa')} placeholder="3.8 / 4.0 (optional)" />
      </StepShell>
    </form>
  );
}
