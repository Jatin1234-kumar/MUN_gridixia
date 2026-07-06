import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, type PaymentData, type ApplicationDraft } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormSelect, FormInput } from '../components/FormField';
import { cn } from '@/lib/utils';

const PAYMENT_OPTIONS = [
  { value: 'card',       label: 'Credit / Debit Card' },
  { value: 'upi',        label: 'UPI' },
  { value: 'netbanking', label: 'Net Banking' },
];

interface Props {
  draft: ApplicationDraft;
  onNext: (data: PaymentData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  direction: 1 | -1;
}

export function PaymentStep({ draft, onNext, onBack, isSubmitting, direction }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: draft.payment ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell
        title="Payment"
        subtitle="Select your payment method to complete registration."
        stepNumber={7} totalSteps={7}
        onNext={handleSubmit(onNext)}
        onBack={onBack}
        nextLabel="Submit Application"
        isSubmitting={isSubmitting}
        direction={direction}
      >
        {/* Fee summary */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Fee Summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Registration Fee</span>
            <span className="text-foreground">₹1,500</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Committee Fee</span>
            <span className="text-foreground">₹500</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Fee</span>
            <span className="text-foreground">₹100</span>
          </div>
          <div className={cn('flex justify-between text-sm font-semibold pt-2 border-t border-white/[0.06]')}>
            <span className="text-foreground">Total</span>
            <span className="text-gold-400">₹2,100</span>
          </div>
        </div>

        <FormSelect
          label="Payment Method" required
          error={errors.paymentMethod?.message}
          options={PAYMENT_OPTIONS}
          placeholder="Select payment method"
          {...register('paymentMethod')}
        />

        <FormInput
          label="Promo Code"
          error={errors.promoCode?.message}
          {...register('promoCode')}
          placeholder="Enter promo code (optional)"
        />

        <p className="text-xs text-muted-foreground">
          You will be redirected to Razorpay to complete the payment securely after submitting.
        </p>
      </StepShell>
    </form>
  );
}
