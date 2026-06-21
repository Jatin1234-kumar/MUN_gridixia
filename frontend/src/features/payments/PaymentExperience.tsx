import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Flame,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TimerReset,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import type { Committee, DelegateApplicationDraft, Event, PaymentSession, PaymentStatus } from '@/types';

const delegateDraftKey = 'mun-gridixia:delegate-application-draft:v1';
const paymentDraftKey = 'mun-gridixia:payment-draft:v1';
const paymentSessionKey = 'mun-gridixia:payment-session:v1';

const paymentSchema = z.object({
  applicantName: z.string().min(2, 'Applicant name is required').max(120),
  email: z.string().email('Enter a valid email address'),
  committeeId: z.string().min(1, 'Select a committee'),
  paymentMethod: z.enum(['card', 'upi', 'bank_transfer']),
  billingName: z.string().min(2, 'Billing name is required').max(120),
  couponCode: z.string().optional().default(''),
  consent: z.boolean().refine(Boolean, 'You must confirm the payment details are correct'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type PaymentFlowStatus = PaymentStatus;

const statusMeta: Record<PaymentFlowStatus, { label: string; badge: 'pending' | 'active' | 'urgent' | 'inactive'; icon: ComponentType<{ className?: string }>; description: string; progress: number }> = {
  pending: {
    label: 'Pending',
    badge: 'pending',
    icon: TimerReset,
    description: 'Your session is saved and waiting for payment to begin.',
    progress: 20,
  },
  processing: {
    label: 'Processing',
    badge: 'urgent',
    icon: RefreshCw,
    description: 'We are creating the payment order and contacting the gateway.',
    progress: 55,
  },
  success: {
    label: 'Success',
    badge: 'active',
    icon: CheckCircle2,
    description: 'Payment confirmed and registration secured.',
    progress: 100,
  },
  failed: {
    label: 'Failed',
    badge: 'urgent',
    icon: ShieldX,
    description: 'The payment was not completed. You can retry or create a fresh order.',
    progress: 35,
  },
};

const defaultValues: PaymentFormValues = {
  applicantName: '',
  email: '',
  committeeId: '',
  paymentMethod: 'card',
  billingName: '',
  couponCode: '',
  consent: false,
};

function readJson<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearPaymentStorage() {
  window.localStorage.removeItem(paymentDraftKey);
  window.localStorage.removeItem(paymentSessionKey);
  window.localStorage.removeItem(`${paymentSessionKey}:locked`);
}

function getSeedValues(): Partial<PaymentFormValues> {
  const delegateDraft = readJson<DelegateApplicationDraft>(delegateDraftKey);
  const paymentDraft = readJson<Partial<PaymentFormValues>>(paymentDraftKey);

  return {
    ...paymentDraft,
    applicantName: paymentDraft?.applicantName ?? delegateDraft?.personal.fullName ?? '',
    email: paymentDraft?.email ?? delegateDraft?.personal.email ?? '',
    committeeId: paymentDraft?.committeeId ?? delegateDraft?.committeePreference.preferredCommitteeId ?? '',
    billingName: paymentDraft?.billingName ?? delegateDraft?.personal.fullName ?? '',
  };
}

function computeFees(committee?: Committee, event?: Event, couponCode = '') {
  const baseFee = event?.type === 'YOUTH_PARLIAMENT' ? 2800 : 3500;
  const committeeFee = committee ? (committee.type === 'MUN' ? 1700 : 1300) + Math.round(committee.capacity * 10) : 1500;
  const kitFee = 250;
  const serviceFee = 300;
  const subtotal = baseFee + committeeFee + kitFee + serviceFee;
  const discount = couponCode.trim().toUpperCase() === 'GRIDIXIA10' ? Math.round(subtotal * 0.1) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;

  return {
    baseFee,
    committeeFee,
    kitFee,
    serviceFee,
    discount,
    tax,
    total,
  };
}

function generateOrderId() {
  return `ord_${crypto.randomUUID().slice(0, 12)}`;
}

function generateReceiptId() {
  return `rcpt_${crypto.randomUUID().slice(0, 10)}`;
}

function PaymentStatusCard({ status, session }: { status: PaymentFlowStatus; session?: PaymentSession }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Card className="glass-card border-white/[0.08]">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Payment Status</CardTitle>
            <CardDescription>Live payment lifecycle with session recovery.</CardDescription>
          </div>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', status === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : status === 'failed' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-gold-500/30 bg-gold-500/10 text-gold-300')}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{meta.label}</p>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <Progress value={meta.progress} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <StatusStep title="Pending" active={status === 'pending'} done={status === 'processing' || status === 'success' || status === 'failed'} />
        <StatusStep title="Processing" active={status === 'processing'} done={status === 'success' || status === 'failed'} />
        <StatusStep title="Success" active={status === 'success'} done={status === 'success'} />
        <StatusStep title="Failed" active={status === 'failed'} done={status === 'failed'} />
        {session?.orderId && (
          <div className="rounded-xl border border-white/[0.06] bg-navy-900/60 p-3 text-xs text-muted-foreground">
            <p className="uppercase tracking-[0.28em] text-muted-foreground">Order ID</p>
            <p className="mt-1 font-mono text-foreground">{session.orderId}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusStep({ title, active, done }: { title: string; active: boolean; done: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border px-3 py-2', active ? 'border-gold-500/30 bg-gold-500/10 text-foreground' : 'border-white/[0.06] bg-white/[0.02]')}>
      <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border', done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : active ? 'border-gold-500/30 bg-gold-500/10 text-gold-300' : 'border-white/[0.08] bg-navy-900/70')}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Flame className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{active ? 'Current step' : done ? 'Completed' : 'Waiting'}</p>
      </div>
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <Card className="glass-card border-white/[0.08]">
      <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">{children}</CardContent>
    </Card>
  );
}

function useRestoreableSession() {
  const [session, setSession] = useState<PaymentSession | undefined>(() => readJson<PaymentSession>(paymentSessionKey));
  const [savedDraft, setSavedDraft] = useState<Partial<PaymentFormValues>>(() => readJson<Partial<PaymentFormValues>>(paymentDraftKey) ?? {});

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (session && (session.status === 'pending' || session.status === 'processing')) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  return { session, setSession, savedDraft, setSavedDraft };
}

export function PaymentExperience() {
  const queryClient = useQueryClient();
  const { data: committees = [] } = useCommittees();
  const { data: events = [] } = useEvents();
  const { session, setSession, savedDraft, setSavedDraft } = useRestoreableSession();
  const [infoMessage, setInfoMessage] = useState('Ready to create a secure order.');
  const [lastRecoveryAction, setLastRecoveryAction] = useState('');
  const seedValues = useMemo(() => getSeedValues(), []);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { ...defaultValues, ...seedValues },
    mode: 'onTouched',
    shouldUnregister: false,
  });

  const watched = useWatch({ control: form.control });
  const committeeId = form.watch('committeeId');
  const couponCode = form.watch('couponCode') ?? '';

  useEffect(() => {
    if (!watched) return;

    const timer = window.setTimeout(() => {
      const currentValues = form.getValues();
      setSavedDraft(currentValues);
      writeJson(paymentDraftKey, currentValues);
      setInfoMessage('Payment draft autosaved locally.');
    }, 400);

    return () => window.clearTimeout(timer);
  }, [watched, form]);

  useEffect(() => {
    if (session) {
      writeJson(paymentSessionKey, session);
      window.localStorage.setItem(`${paymentSessionKey}:locked`, session.orderId);
    }
  }, [session]);

  const selectedCommittee = committees.find((committee: Committee) => committee.id === committeeId) ?? committees.find((committee: Committee) => committee.id === savedDraft.committeeId);
  const selectedEvent = events.find((event: Event) => event.id === selectedCommittee?.eventId);
  const fees = computeFees(selectedCommittee, selectedEvent, couponCode);
  const paymentStatus = session?.status ?? 'pending';
  const hasActiveLock = Boolean(session && (session.status === 'pending' || session.status === 'processing'));
  const hasFailedSession = session?.status === 'failed';

  const paymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const currentSession = readJson<PaymentSession>(paymentSessionKey);

      if (currentSession && (currentSession.status === 'pending' || currentSession.status === 'processing')) {
        throw new Error('An active order already exists. Resume the saved session instead of creating a duplicate order.');
      }

      const committee = committees.find((item) => item.id === values.committeeId);
      const event = events.find((item) => item.id === committee?.eventId);
      const computedFees = computeFees(committee, event, values.couponCode ?? '');
      const orderId = currentSession?.orderId ?? generateOrderId();
      const attempts = (currentSession?.attempts ?? 0) + 1;
      const processingSession: PaymentSession = {
        orderId,
        receiptId: generateReceiptId(),
        status: 'processing',
        attempts,
        applicantName: values.applicantName,
        email: values.email,
        committeeId: values.committeeId,
        committeeName: committee?.name ?? 'Committee',
        committeeAbbr: committee?.abbr ?? 'N/A',
        eventId: event?.id ?? committee?.eventId ?? '',
        eventName: event?.name ?? 'Event',
        eventDate: event?.date ?? new Date().toISOString(),
        paymentMethod: values.paymentMethod,
        amount: computedFees.total,
        baseFee: computedFees.baseFee,
        committeeFee: computedFees.committeeFee,
        serviceFee: computedFees.serviceFee,
        tax: computedFees.tax,
        discount: computedFees.discount,
        createdAt: currentSession?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSession(processingSession);
      setInfoMessage('Payment order is processing. Keep this tab open until it completes.');

      await new Promise((resolve) => window.setTimeout(resolve, 1300));

      if ((values.couponCode ?? '').trim().toUpperCase() === 'DECLINED') {
        const failedSession: PaymentSession = {
          ...processingSession,
          status: 'failed',
          failureReason: 'Sandbox decline triggered by coupon code DECLINED.',
          updatedAt: new Date().toISOString(),
        };

        writeJson(paymentSessionKey, failedSession);
        window.localStorage.removeItem(`${paymentSessionKey}:locked`);
        return failedSession;
      }

      if (values.paymentMethod === 'bank_transfer') {
        const pendingSession: PaymentSession = {
          ...processingSession,
          status: 'pending',
          failureReason: 'Awaiting manual bank transfer verification.',
          updatedAt: new Date().toISOString(),
        };

        writeJson(paymentSessionKey, pendingSession);
        return pendingSession;
      }

      const successSession: PaymentSession = {
        ...processingSession,
        status: 'success',
        updatedAt: new Date().toISOString(),
      };

      writeJson(paymentSessionKey, successSession);
      window.localStorage.removeItem(`${paymentSessionKey}:locked`);
      return successSession;
    },
    onSuccess: (result) => {
      setSession(result);
      setInfoMessage(
        result.status === 'success'
          ? 'Payment completed successfully. Your order is locked to prevent duplicates.'
          : result.status === 'pending'
            ? 'Payment is pending manual verification. The order is preserved for recovery.'
            : 'Payment failed. You can retry using the same order or clear the session to start fresh.',
      );
      queryClient.invalidateQueries({ queryKey: ['delegates'] });
    },
    onError: (error) => {
      setInfoMessage(error instanceof Error ? error.message : 'Unable to create a payment order.');
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (hasActiveLock) {
      setInfoMessage('A payment order is already active. Resume the saved session to avoid duplicate orders.');
      return;
    }

    await paymentMutation.mutateAsync(values);
  });

  const resumeSavedSession = () => {
    if (!session) return;

    form.reset({
      applicantName: session.applicantName,
      email: session.email,
      committeeId: session.committeeId,
      paymentMethod: session.paymentMethod,
      billingName: session.applicantName,
      couponCode: savedDraft.couponCode ?? '',
      consent: true,
    });
    setInfoMessage('Saved payment session restored. You can continue without creating a new order.');
    setLastRecoveryAction('Restored saved order');
  };

  const retryFailedPayment = async () => {
    if (!session || session.status !== 'failed') return;

    setSession({ ...session, status: 'processing', attempts: session.attempts + 1, failureReason: undefined, updatedAt: new Date().toISOString() });
    await paymentMutation.mutateAsync({
      applicantName: session.applicantName,
      email: session.email,
      committeeId: session.committeeId,
      paymentMethod: session.paymentMethod,
      billingName: session.applicantName,
      couponCode: '',
      consent: true,
    });
    setLastRecoveryAction('Retried existing order');
  };

  const startFresh = () => {
    clearPaymentStorage();
    setSession(undefined);
    setSavedDraft({});
    form.reset(defaultValues);
    setInfoMessage('Fresh payment session started.');
    setLastRecoveryAction('Started fresh');
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Payment Experience"
        subtitle="Registration summary, fee breakdown, payment status, and recovery in one place"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/delegates">
              Back to application
              <ChevronRight size={14} />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard title="Registration Summary" description="The details below are synchronized from your application draft and current selections." icon={Sparkles}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueRow label="Applicant" value={form.watch('applicantName') || 'Not set'} />
              <ValueRow label="Email" value={form.watch('email') || 'Not set'} />
              <ValueRow label="Committee" value={selectedCommittee ? `${selectedCommittee.abbr} - ${selectedCommittee.name}` : 'Not selected'} />
              <ValueRow label="Event" value={selectedEvent ? `${selectedEvent.name} • ${formatDate(selectedEvent.date)}` : 'Auto-linked to committee'} />
              <ValueRow label="Country Preference" value={(readJson<DelegateApplicationDraft>(delegateDraftKey)?.countryPreference.firstChoiceCountry) || 'Imported from application draft'} />
              <ValueRow label="Session Status" value={statusMeta[paymentStatus].label} />
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Duplicate Guard</p>
              <p className="mt-2">Active sessions are locked in local storage. Refreshing the page restores the order instead of creating a duplicate.</p>
            </div>
          </SectionCard>

          <SectionCard title="Committee Selection" description="Choose the committee tied to this payment and review its linked event." icon={Wallet}>
            <div className="space-y-1.5">
              <Label htmlFor="committeeId">Committee</Label>
              <select
                id="committeeId"
                {...form.register('committeeId')}
                className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              >
                <option value="">Select committee</option>
                {committees.map((committee) => (
                  <option key={committee.id} value={committee.id}>
                    {committee.abbr} - {committee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
              <ValueRow label="Committee Type" value={selectedCommittee?.type ?? 'Not selected'} />
              <ValueRow label="Capacity" value={selectedCommittee ? formatNumber(selectedCommittee.capacity) : '—'} />
              <ValueRow label="Linked Event" value={selectedEvent ? selectedEvent.name : 'Not selected'} />
              <ValueRow label="Event Date" value={selectedEvent ? formatDate(selectedEvent.date) : '—'} />
            </div>
          </SectionCard>

          <SectionCard title="Fee Breakdown" description="Transparent fee calculation that updates when committee or coupon changes." icon={CreditCard}>
            <div className="space-y-2">
              <ValueRow label="Base Registration" value={formatNumber(fees.baseFee)} />
              <ValueRow label="Committee Allocation" value={formatNumber(fees.committeeFee)} />
              <ValueRow label="Delegate Kit" value={formatNumber(fees.kitFee)} />
              <ValueRow label="Gateway Fee" value={formatNumber(fees.serviceFee)} />
              <ValueRow label="Discount" value={`-${formatNumber(fees.discount)}`} />
              <ValueRow label="Tax" value={formatNumber(fees.tax)} />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-gold-300">Total Due</p>
                <p className="text-sm text-gold-100">Including taxes and processing</p>
              </div>
              <p className="text-2xl font-semibold text-gold-300">{formatNumber(fees.total)}</p>
            </div>
          </SectionCard>

          <SectionCard title="Payment Form" description="Complete the payment information and lock the order before moving to the gateway." icon={ShieldCheck}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="applicantName">Applicant Name</Label>
                <Input id="applicantName" {...form.register('applicantName')} placeholder="Alexandra Chen" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} placeholder="alexandra@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <select
                  id="paymentMethod"
                  {...form.register('paymentMethod')}
                  className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
                >
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingName">Billing Name</Label>
                <Input id="billingName" {...form.register('billingName')} placeholder="Alexandra Chen" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="couponCode">Coupon Code</Label>
                <Input id="couponCode" {...form.register('couponCode')} placeholder="Optional promo code or DECLINED for sandbox failure" />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/[0.12] bg-navy-800 text-gold-500 focus:ring-gold-500/50" {...form.register('consent')} />
                <span>
                  <span className="block text-sm font-medium text-foreground">I confirm the registration summary and amount are correct.</span>
                  <span className="block text-xs text-muted-foreground">Orders are locked locally to prevent duplicate submissions.</span>
                </span>
              </label>
            </div>

            <CardFooter className="flex flex-col gap-3 px-0 pb-0 pt-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={13} className="text-gold-400" />
                <span>{infoMessage}</span>
              </div>
              <Button onClick={onSubmit} disabled={paymentMutation.isPending || hasActiveLock} className="w-full sm:w-auto">
                {paymentMutation.isPending ? 'Processing…' : hasActiveLock ? 'Resume Existing Order' : 'Pay Securely'}
              </Button>
            </CardFooter>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <PaymentStatusCard status={paymentStatus} session={session} />

          <Card className="glass-card border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-base">Recovery Flow</CardTitle>
              <CardDescription>Recover from refreshes, failed payments, or locked sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={resumeSavedSession} disabled={!session || paymentStatus === 'success'}>
                <RefreshCw size={14} /> Resume Saved Session
              </Button>
              <Button variant="outline" className="w-full" onClick={retryFailedPayment} disabled={!hasFailedSession || paymentMutation.isPending}>
                <RotateCcw size={14} /> Retry Failed Payment
              </Button>
              <Button variant="secondary" className="w-full" onClick={startFresh}>
                <TimerReset size={14} /> Start Fresh
              </Button>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-gold-400">
                  <AlertTriangle size={13} /> Duplicate order protection is active
                </div>
                <p className="mt-2">If an order is already pending or processing, the app restores it instead of creating a new one.</p>
                {lastRecoveryAction && <p className="mt-2 text-foreground">Last recovery action: {lastRecoveryAction}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-base">Page Refresh Safety</CardTitle>
              <CardDescription>What happens if the browser refreshes or closes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>The current draft and active order are stored locally in the browser.</p>
              <p>Refreshing the page restores the payment session and preserves the current order ID.</p>
              <p>Pending bank transfers remain visible until manual verification completes.</p>
            </CardContent>
          </Card>

          {session?.status === 'failed' && (
            <Card className="glass-card border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-base text-red-200">Failure Recovery</CardTitle>
                <CardDescription className="text-red-100/70">This payment failed and can be retried without creating a duplicate order.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-red-100/80">
                <p>{session.failureReason}</p>
                <p>Fix the payment details or coupon code, then retry the same session.</p>
              </CardContent>
            </Card>
          )}

          {session?.status === 'success' && (
            <Card className="glass-card border-emerald-500/20 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-base text-emerald-200">Payment Complete</CardTitle>
                <CardDescription className="text-emerald-100/70">Order locked successfully with no duplicate submissions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-emerald-100/80">
                <p>Receipt: {session.receiptId}</p>
                <p>You can safely leave this page or continue to another section of the dashboard.</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/delegates">Back to delegate flow</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
