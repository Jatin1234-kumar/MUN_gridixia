import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, type PaymentData, type ApplicationDraft } from '../apply.schemas';
import { StepShell } from '../components/StepShell';
import { FormSelect, FormInput } from '../components/FormField';
import { cn } from '@/lib/utils';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import type { Committee, Event } from '@/types';

const PAYMENT_OPTIONS = [
  { value: 'card',       label: 'Credit / Debit Card' },
  { value: 'upi',        label: 'UPI' },
  { value: 'netbanking', label: 'Net Banking' },
];

function computeFees(committee?: Committee, event?: Event, promoCode = '') {
  const baseFee = event?.baseFee ?? (event?.type === 'YOUTH_PARLIAMENT' ? 2800 : 3500);
  const committeeFee = committee
    ? (committee.type === 'MUN' ? 1700 : 1300) + Math.round(committee.capacity * 10)
    : 1500;
  const kitFee = 250;
  const serviceFee = 300;
  const subtotal = baseFee + committeeFee + kitFee + serviceFee;
  const discount = promoCode.trim().toUpperCase() === 'GRIDIXIA10' ? Math.round(subtotal * 0.1) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;
  return { baseFee, committeeFee, kitFee, serviceFee, discount, tax, total };
}

interface Props {
  draft: ApplicationDraft;
  onNext: (data: PaymentData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  direction: 1 | -1;
}

export function PaymentStep({ draft, onNext, onBack, isSubmitting, direction }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: draft.payment ?? {},
  });

  const promoCode = watch('promoCode') ?? '';
  const { data: committees = [] } = useCommittees();
  const { data: events = [] } = useEvents();

  const selectedCommitteeId = draft.committeePref?.preference1;
  const committee = committees.find((c: Committee) => c.id === selectedCommitteeId);
  const event = events.find((e: Event) => e.id === draft.eventId);
  const fees = computeFees(committee, event, promoCode);

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
            <span className="text-muted-foreground">Base Registration</span>
            <span className="text-foreground">₹{fees.baseFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Committee Fee{committee ? ` (${committee.abbr})` : ''}</span>
            <span className="text-foreground">₹{fees.committeeFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delegate Kit</span>
            <span className="text-foreground">₹{fees.kitFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Fee</span>
            <span className="text-foreground">₹{fees.serviceFee.toLocaleString()}</span>
          </div>
          {fees.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount (GRIDIXIA10)</span>
              <span className="text-emerald-400">-₹{fees.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST (18%)</span>
            <span className="text-foreground">₹{fees.tax.toLocaleString()}</span>
          </div>
          <div className={cn('flex justify-between text-sm font-semibold pt-2 border-t border-white/[0.06]')}>
            <span className="text-foreground">Total</span>
            <span className="text-gold-400">₹{fees.total.toLocaleString()}</span>
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
