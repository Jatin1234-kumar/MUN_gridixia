import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}
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
  ArrowUpDown,
  Banknote,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import api, { getApiErrorMessage } from '@/lib/api';
import { readJson, writeJson } from '@/lib/storage';
import { useCommittees } from '@/hooks/useCommittees';
import { useEvents } from '@/hooks/useEvents';
import type {
  Committee,
  DelegateApplicationDraft,
  Event,
  PaymentSession,
  PaymentStatus,
} from '@/types';

const delegateDraftKey = (uid: string) => `mun-gridixia:delegate-application-draft:v1:${uid}`;
const paymentDraftKey = (uid: string) => `mun-gridixia:payment-draft:v1:${uid}`;
const paymentSessionKey = (uid: string) => `mun-gridixia:payment-session:v1:${uid}`;
const paidEventIdsKey = (uid: string) => `mun-gridixia:paid-event-ids:v1:${uid}`;
const razorpayCheckoutSrc = 'https://checkout.razorpay.com/v1/checkout.js';

const paymentSchema = z.object({
  applicantName: z.string().min(2, 'Applicant name is required').max(120),
  email: z.string().email('Enter a valid email address'),
  committeeId: z.string().min(1, 'Select a committee'),
  paymentMethod: z.enum(['card', 'upi', 'netbanking']),
  billingName: z.string().min(2, 'Billing name is required').max(120),
  couponCode: z.string().optional().default(''),
  consent: z.boolean().refine(Boolean, 'You must confirm the payment details are correct'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type PaymentPrefill = Pick<
  PaymentFormValues,
  'applicantName' | 'email' | 'committeeId' | 'billingName' | 'paymentMethod' | 'couponCode'
>;

type PaymentFlowStatus = PaymentStatus;

interface CreatePaymentOrderResponse {
  keyId: string;
  orderId: string;
  receiptId: string;
  registrationId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  feeBreakdown: {
    baseFee?: number;
    committeeFee?: number;
    kitFee?: number;
    serviceFee?: number;
    discount?: number;
    tax?: number;
    total?: number;
  };
  committee: {
    id: string;
    name: string;
    abbr: string;
  };
  event: {
    id: string;
    name: string;
    date: string;
  };
}

interface VerifyPaymentResponse {
  orderId: string;
  paymentId?: string;
  receiptId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failureReason?: string;
}

const statusMeta: Record<
  PaymentFlowStatus,
  {
    label: string;
    badge: 'pending' | 'active' | 'urgent' | 'inactive';
    icon: ComponentType<{ className?: string }>;
    description: string;
    progress: number;
  }
> = {
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

function getPaidEventIds(uid: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(paidEventIdsKey(uid)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function addPaidEventId(uid: string, eventId: string) {
  const ids = getPaidEventIds(uid);
  if (!ids.includes(eventId)) {
    localStorage.setItem(paidEventIdsKey(uid), JSON.stringify([...ids, eventId]));
  }
}

function clearPaymentStorage(uid: string) {
  window.localStorage.removeItem(paymentDraftKey(uid));
  window.localStorage.removeItem(paymentSessionKey(uid));
  window.localStorage.removeItem(`${paymentSessionKey(uid)}:locked`);
}

function getSeedValues(uid: string, userEmail: string): Partial<PaymentFormValues> {
  const delegateDraft = readJson<DelegateApplicationDraft>(delegateDraftKey(uid));
  const paymentDraft = readJson<Partial<PaymentFormValues>>(paymentDraftKey(uid));
  const firstNonEmpty = (...values: Array<string | undefined>) =>
    values.find((value) => Boolean(value?.trim())) ?? '';

  return {
    ...paymentDraft,
    applicantName: firstNonEmpty(paymentDraft?.applicantName, delegateDraft?.personal?.fullName),
    email: firstNonEmpty(paymentDraft?.email, delegateDraft?.personal?.email, userEmail),
    committeeId: firstNonEmpty(
      paymentDraft?.committeeId,
      delegateDraft?.committeePreference?.preferredCommitteeId,
    ),
    billingName: firstNonEmpty(paymentDraft?.billingName, delegateDraft?.personal?.fullName),
  };
}

function getPaymentPrefill(state: unknown): Partial<PaymentPrefill> | undefined {
  if (!state || typeof state !== 'object' || !('paymentPrefill' in state)) return undefined;
  const prefill = (state as { paymentPrefill?: unknown }).paymentPrefill;
  if (!prefill || typeof prefill !== 'object') return undefined;

  const value = prefill as Record<string, unknown>;
  return {
    applicantName: typeof value.applicantName === 'string' ? value.applicantName : undefined,
    email: typeof value.email === 'string' ? value.email : undefined,
    committeeId: typeof value.committeeId === 'string' ? value.committeeId : undefined,
    billingName: typeof value.billingName === 'string' ? value.billingName : undefined,
    paymentMethod: ['card', 'upi', 'netbanking'].includes(String(value.paymentMethod))
      ? (value.paymentMethod as PaymentFormValues['paymentMethod'])
      : undefined,
    couponCode: typeof value.couponCode === 'string' ? value.couponCode : undefined,
  };
}

function computeFees(committee?: Committee, event?: Event, couponCode = '') {
  const baseFee = event?.baseFee ?? (event?.type === 'YOUTH_PARLIAMENT' ? 2800 : 3500);
  const committeeFee = committee
    ? (committee.type === 'MUN' ? 1700 : 1300) + Math.round(committee.capacity * 10)
    : 1500;
  const kitFee = 250;
  const serviceFee = 300;
  const subtotal = baseFee + committeeFee + kitFee + serviceFee;
  const discount =
    couponCode.trim().toUpperCase() === 'GRIDIXIA10' ? Math.round(subtotal * 0.1) : 0;
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

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${razorpayCheckoutSrc}"]`,
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Unable to load Razorpay Checkout')),
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = razorpayCheckoutSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
    document.body.appendChild(script);
  });
}

function createSessionFromOrder(
  order: CreatePaymentOrderResponse,
  values: PaymentFormValues,
  attempts: number,
  status: PaymentStatus,
): PaymentSession {
  return {
    orderId: order.orderId,
    receiptId: order.receiptId,
    registrationId: order.registrationId,
    keyId: order.keyId,
    currency: order.currency,
    status,
    attempts,
    applicantName: values.applicantName,
    email: values.email,
    committeeId: order.committee.id,
    committeeName: order.committee.name,
    committeeAbbr: order.committee.abbr,
    eventId: order.event.id,
    eventName: order.event.name,
    eventDate: order.event.date,
    paymentMethod: values.paymentMethod,
    amount: order.amount,
    baseFee: order.feeBreakdown.baseFee ?? 0,
    committeeFee: order.feeBreakdown.committeeFee ?? 0,
    serviceFee: order.feeBreakdown.serviceFee ?? 0,
    tax: order.feeBreakdown.tax ?? 0,
    discount: order.feeBreakdown.discount ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Safely coerce any value to a display string — prevents [object Object] in JSX. */
function toDisplayString(value: unknown, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized && normalized !== '[object Object]' ? normalized : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  // ObjectId or object leaked from Mongoose — extract known id fields
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const identifier =
      obj.id ?? obj._id ?? obj.receiptId ?? obj.transactionId ?? obj.url ?? obj.reference;
    if (identifier !== value) {
      const displayIdentifier = toDisplayString(identifier, '');
      if (displayIdentifier) return displayIdentifier;
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Circular or otherwise non-serializable values fall through to the safe default.
    }
  }
  return fallback;
}

function isPaymentSession(value: unknown): value is PaymentSession {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'orderId' in value &&
    'receiptId' in value &&
    'status' in value &&
    'attempts' in value,
  );
}

function PaymentStatusCard({
  status,
  session,
}: {
  status: PaymentFlowStatus;
  session?: PaymentSession;
}) {
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
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl border',
              status === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : status === 'failed'
                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border-gold-500/30 bg-gold-500/10 text-gold-300',
            )}
          >
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
        <StatusStep
          title="Pending"
          active={status === 'pending'}
          done={status === 'processing' || status === 'success' || status === 'failed'}
        />
        <StatusStep
          title="Processing"
          active={status === 'processing'}
          done={status === 'success' || status === 'failed'}
        />
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
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2',
        active
          ? 'border-gold-500/30 bg-gold-500/10 text-foreground'
          : 'border-white/[0.06] bg-white/[0.02]',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full border',
          done
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : active
              ? 'border-gold-500/30 bg-gold-500/10 text-gold-300'
              : 'border-white/[0.08] bg-navy-900/70',
        )}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : active ? (
          <Flame className="h-4 w-4" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {active ? 'Current step' : done ? 'Completed' : 'Waiting'}
        </p>
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

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
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

interface VaultStatus {
  applicantName: string | null;
  billingName: string | null;
  applicantEmail: string | null;
  committeeName: string | null;
  committeeAbbr: string | null;
  committeeId: string | null;
  paymentVerified: boolean;
  checkedIn: boolean;
  registrationStatus: string;
}

interface RegistrationStatus {
  registrationNumber: string;
  status: string;
  paymentStatus: string;
  committeeId: string | null;
  eventId: string;
  isConfirmed: boolean;
}

/** Returns true if a stored PaymentSession has any non-string fields that would
 *  render as [object Object]. Corrupt sessions must be wiped before use. */
function isCorruptSession(session: PaymentSession): boolean {
  return (
    typeof session.receiptId !== 'string' ||
    typeof session.orderId !== 'string' ||
    typeof session.committeeId !== 'string'
  );
}

function useRestoreableSession(uid: string) {
  const [session, setSession] = useState<PaymentSession | undefined>(() => {
    const saved = readJson<PaymentSession>(paymentSessionKey(uid));
    if (!saved) return undefined;
    // Wipe any session that has non-string fields — these are corrupt entries
    // from a previous bug where Mongoose ObjectId objects leaked into storage.
    if (isCorruptSession(saved)) {
      clearPaymentStorage(uid);
      return undefined;
    }
    return saved;
  });
  const [savedDraft, setSavedDraft] = useState<Partial<PaymentFormValues>>(
    () => readJson<Partial<PaymentFormValues>>(paymentDraftKey(uid)) ?? {},
  );

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

// ── Admin ledger types ────────────────────────────────────────────────────────

interface LedgerRow {
  id: string;
  orderId: string;
  receiptId: string;
  amount: number;
  currency: string;
  status: string;
  applicantName: string;
  email: string;
  eventName: string;
  paidAt: string | null;
  createdAt: string;
}

interface LedgerResponse {
  rows: LedgerRow[];
  total: number;
  page: number;
  pages: number;
}

const statusBadgeVariant: Record<string, 'active' | 'pending' | 'urgent' | 'inactive'> = {
  success: 'active',
  pending: 'pending',
  processing: 'urgent',
  failed: 'urgent',
};

function PaymentLedger() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery<LedgerResponse>({
    queryKey: ['admin-payments', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: LedgerResponse }>(`/payments?page=${page}&limit=20`);
      return data.data;
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Payment Ledger"
        subtitle="All system transactions across every delegate and event"
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Banknote size={14} className="text-gold-400" />
            {data ? `${data.total} total transactions` : 'Loading…'}
          </div>
        }
      />

      <Card className="glass-card border-white/[0.08]">
        <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <ArrowUpDown className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">All Payments</CardTitle>
              <CardDescription>
                Sorted by most recent. Page {page} of {data?.pages ?? '…'}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading transactions…
            </div>
          )}
          {isError && (
            <div className="flex items-center justify-center py-16 text-sm text-red-400">
              Failed to load payment data.
            </div>
          )}
          {data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{row.applicantName}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{row.eventName}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {row.orderId}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        ₹{row.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusBadgeVariant[row.status] ?? 'inactive'}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {row.paidAt ? formatDate(row.paidAt) : formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {data && data.pages > 1 && (
          <CardFooter className="flex items-center justify-between gap-3 border-t border-white/[0.06] p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {data.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
            >
              Next
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

// ── Role-aware entry point ─────────────────────────────────────────────────────

export function PaymentExperience() {
  const { user } = useAuth();

  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return <PaymentLedger />;
  }

  return <DelegatePaymentExperience />;
}

// ── Delegate checkout (original PaymentExperience, renamed) ───────────────────

function DelegatePaymentExperience() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuth();
  const uid = user?.id ?? 'anonymous';
  const { data: committees = [] } = useCommittees();
  const { data: events = [] } = useEvents();
  const { session, setSession, savedDraft, setSavedDraft } = useRestoreableSession(uid);
  const skipVaultHydration = useRef(false);
  const [infoMessage, setInfoMessage] = useState('Ready to create a secure order.');
  const [lastRecoveryAction, setLastRecoveryAction] = useState('');
  const [formError, setFormError] = useState('');
  const incomingPrefill = useMemo(() => getPaymentPrefill(location.state), [location.key]);
  const seedValues = useMemo(
    () => ({ ...getSeedValues(uid, user?.email ?? ''), ...incomingPrefill }),
    [uid, user?.email, incomingPrefill],
  );

  // ── Backend vault hydration ──────────────────────────────────────────────
  const { data: vaultStatus } = useQuery<VaultStatus | null>({
    queryKey: ['my-vault-status', uid],
    queryFn: async () => {
      const { data } = await api.get<{ data: VaultStatus | null }>('/payments/my-vault-status');
      return data.data;
    },
    staleTime: 60_000,
    enabled: uid !== 'anonymous',
  });

  const { data: registrationStatus } = useQuery<RegistrationStatus | null>({
    queryKey: ['my-registration-status', uid],
    queryFn: async () => {
      const { data } = await api.get<{ data: RegistrationStatus | null }>(
        '/payments/my-registration-status',
      );
      return data.data;
    },
    staleTime: 60_000,
    enabled: uid !== 'anonymous',
  });

  useEffect(() => {
    if (!vaultStatus?.paymentVerified) return;
    if (skipVaultHydration.current) return;
    if (session?.status === 'success') return;
    // Clear any corrupt localStorage remnant before writing the clean synthesized session.
    clearPaymentStorage(uid);
    const safeReceipt = registrationStatus?.registrationNumber ?? 'Confirmed';
    const safeCommitteeId =
      typeof vaultStatus.committeeId === 'string' ? vaultStatus.committeeId : '';
    setSession((prev) => ({
      orderId: prev?.orderId ?? 'DB-CONFIRMED',
      receiptId: prev?.receiptId ?? safeReceipt,
      registrationId: prev?.registrationId,
      status: 'success',
      attempts: prev?.attempts ?? 1,
      applicantName: vaultStatus.applicantName ?? prev?.applicantName ?? user?.email ?? '',
      email: vaultStatus.applicantEmail ?? prev?.email ?? user?.email ?? '',
      committeeId: safeCommitteeId ?? prev?.committeeId ?? '',
      committeeName: vaultStatus.committeeName ?? prev?.committeeName ?? '',
      committeeAbbr: vaultStatus.committeeAbbr ?? prev?.committeeAbbr ?? '',
      eventId: prev?.eventId ?? '',
      eventName: prev?.eventName ?? '',
      eventDate: prev?.eventDate ?? '',
      paymentMethod: prev?.paymentMethod ?? 'card',
      amount: prev?.amount ?? 0,
      baseFee: prev?.baseFee ?? 0,
      committeeFee: prev?.committeeFee ?? 0,
      serviceFee: prev?.serviceFee ?? 0,
      tax: prev?.tax ?? 0,
      discount: prev?.discount ?? 0,
      createdAt: prev?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }, [vaultStatus, registrationStatus, session?.status]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { ...defaultValues, ...seedValues },
    mode: 'onTouched',
    shouldUnregister: false,
  });

  useEffect(() => {
    form.reset({ ...defaultValues, ...seedValues });
  }, [form, seedValues]);

  const watched = useWatch({ control: form.control });
  const committeeId = form.watch('committeeId');
  const couponCode = form.watch('couponCode') ?? '';

  useEffect(() => {
    if (!watched) return;

    const timer = window.setTimeout(() => {
      const currentValues = form.getValues();
      setSavedDraft(currentValues);
      writeJson(paymentDraftKey(uid), currentValues);
      setInfoMessage('Payment draft autosaved locally.');
    }, 400);

    return () => window.clearTimeout(timer);
  }, [watched, form]);

  useEffect(() => {
    if (session) {
      writeJson(paymentSessionKey(uid), session);
      window.localStorage.setItem(`${paymentSessionKey(uid)}:locked`, session.orderId);
    }
  }, [session, uid]);

  const { data: serverPaidEventIds = [] } = useQuery<string[]>({
    queryKey: ['paid-event-ids', uid],
    queryFn: async () => {
      const { data } = await api.get<{ data: string[] }>('/payments/paid-event-ids');
      return data.data;
    },
    staleTime: 30_000,
  });

  const paidEventIds = useMemo(() => {
    const local = getPaidEventIds(uid);
    const merged = new Set([...serverPaidEventIds, ...local]);
    return merged;
  }, [serverPaidEventIds, uid]);

  const availableCommittees = committees.filter((c: Committee) => !paidEventIds.has(c.eventId));

  const selectedCommittee =
    committees.find((committee: Committee) => committee.id === committeeId) ??
    committees.find((committee: Committee) => committee.id === savedDraft.committeeId);
  const selectedEvent = events.find((event: Event) => event.id === selectedCommittee?.eventId);
  const fees = computeFees(selectedCommittee, selectedEvent, couponCode);
  const paymentStatus = session?.status ?? 'pending';
  const hasActiveLock = Boolean(
    session && (session.status === 'pending' || session.status === 'processing'),
  );
  const hasFailedSession = session?.status === 'failed';

  const paymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const currentSession = readJson<PaymentSession>(paymentSessionKey(uid));
      const attempts = (currentSession?.attempts ?? 0) + 1;

      const { data } = await api.post<{ data: CreatePaymentOrderResponse }>('/payments/orders', {
        committeeId: values.committeeId,
        applicantName: values.applicantName,
        email: values.email,
        paymentMethod: values.paymentMethod,
        billingName: values.billingName,
        couponCode: values.couponCode ?? '',
        applicationDraft: readJson<Record<string, unknown>>(delegateDraftKey(uid)) ?? undefined,
      });

      const order = data.data;
      const processingSession = createSessionFromOrder(order, values, attempts, 'processing');
      setSession(processingSession);
      setInfoMessage('Razorpay order created. Complete the checkout popup to confirm payment.');

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout is unavailable. Please try again.');
      }

      const Razorpay = window.Razorpay;

      return await new Promise<PaymentSession>((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          name: 'Gridixia MUN',
          description: `${order.event.name} - ${order.committee.abbr}`,
          order_id: order.orderId,
          prefill: {
            name: values.billingName || values.applicantName,
            email: values.email,
          },
          notes: {
            registrationId: order.registrationId,
            committeeId: order.committee.id,
            eventId: order.event.id,
          },
          theme: { color: '#d4af37' },
          modal: {
            ondismiss: () => {
              const failedSession: PaymentSession = {
                ...processingSession,
                status: 'failed',
                failureReason: 'Checkout was closed before payment confirmation.',
                updatedAt: new Date().toISOString(),
              };
              window.localStorage.removeItem(`${paymentSessionKey(uid)}:locked`);
              reject(failedSession);
            },
          },
          handler: async (response) => {
            try {
              const verifyResult = await api.post<{ data: VerifyPaymentResponse }>(
                '/payments/verify',
                {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
              );

              const verified = verifyResult.data.data;
              resolve({
                ...processingSession,
                status: verified.status,
                paymentId: verified.paymentId,
                failureReason: verified.failureReason,
                updatedAt: new Date().toISOString(),
              });
            } catch (error) {
              reject({
                ...processingSession,
                status: 'failed',
                failureReason: getApiErrorMessage(error, 'Payment verification failed.'),
                updatedAt: new Date().toISOString(),
              } satisfies PaymentSession);
            }
          },
        });

        checkout.open();
      });
    },
    onSuccess: (result) => {
      setSession(result);
      writeJson(paymentSessionKey(uid), result);
      if (result.status === 'success') {
        addPaidEventId(uid, result.eventId);
      }
      setInfoMessage(
        result.status === 'success'
          ? 'Payment verified successfully. Registration is now confirmed.'
          : 'Payment status updated. You can retry if it did not complete.',
      );
      if (result.status === 'success' || result.status === 'failed') {
        window.localStorage.removeItem(`${paymentSessionKey(uid)}:locked`);
      }
      queryClient.invalidateQueries({ queryKey: ['delegates'] });
      queryClient.invalidateQueries({ queryKey: ['committees'] });
    },
    onError: (error) => {
      if (isPaymentSession(error)) {
        const failedSession = error;
        setSession(failedSession);
        writeJson(paymentSessionKey(uid), failedSession);
        window.localStorage.removeItem(`${paymentSessionKey(uid)}:locked`);
        setInfoMessage(failedSession.failureReason ?? 'Payment did not complete.');
        return;
      }

      setInfoMessage(getApiErrorMessage(error, 'Unable to create a payment order.'));
    },
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError('');
      if (hasActiveLock) {
        setInfoMessage(
          'A payment order is already active. Resume the saved session to avoid duplicate orders.',
        );
        return;
      }
      try {
        await paymentMutation.mutateAsync(values);
      } catch {
        // onError owns the user-facing state for checkout dismissals and verification failures.
      }
    },
    () => {
      setFormError('Please fill in all required fields and check the consent checkbox.');
    },
  );

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
    setInfoMessage(
      'Saved payment session restored. You can continue without creating a new order.',
    );
    setLastRecoveryAction('Restored saved order');
  };

  const retryFailedPayment = async () => {
    if (!session || session.status !== 'failed') return;

    setSession({
      ...session,
      status: 'processing',
      attempts: session.attempts + 1,
      failureReason: undefined,
      updatedAt: new Date().toISOString(),
    });
    try {
      await paymentMutation.mutateAsync({
        applicantName: session.applicantName,
        email: session.email,
        committeeId: session.committeeId,
        paymentMethod: session.paymentMethod,
        billingName: session.applicantName,
        couponCode: '',
        consent: true,
      });
      setLastRecoveryAction('Retried payment order');
    } catch {
      // onError updates the visible failure state.
    }
  };

  const startFresh = () => {
    clearPaymentStorage(uid);
    setSession(undefined);
    setSavedDraft({});
    form.reset({ ...defaultValues, email: user?.email ?? '' });
    setInfoMessage('Fresh payment session started.');
    setLastRecoveryAction('Started fresh');
  };

  if (session?.status === 'success') {
    // All display values go through toDisplayString as a final safety net.
    const displayOrderId =
      session.orderId !== 'DB-CONFIRMED'
        ? toDisplayString(session.orderId)
        : 'Confirmed in database';
    const displayCommittee = session.committeeName
      ? `${toDisplayString(session.committeeAbbr)} — ${toDisplayString(session.committeeName)}`
      : toDisplayString(vaultStatus?.committeeName, 'Confirmed');
    const displayAmount = session.amount > 0 ? `₹${session.amount.toLocaleString()}` : 'Confirmed';
    const displayEvent = toDisplayString(session.eventName, 'Confirmed');
    const displayName = toDisplayString(
      session.applicantName || vaultStatus?.applicantName || user?.email,
    );
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
        <Card className="glass-card border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-emerald-200">Payment Successful</CardTitle>
              <CardDescription className="text-emerald-100/70">
                Your registration is confirmed. No further action needed.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-emerald-100/80">
            <div className="divide-y divide-emerald-500/10 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              {(
                [
                  { label: 'Applicant', value: displayName, mono: false },
                  {
                    label: 'Receipt',
                    value: toDisplayString(
                      session.receiptId !== 'DB-CONFIRMED' ? session.receiptId : null,
                      toDisplayString(registrationStatus?.registrationNumber, 'Confirmed'),
                    ),
                    mono: true,
                  },
                  { label: 'Order ID', value: displayOrderId, mono: true },
                  { label: 'Committee', value: displayCommittee, mono: false },
                  { label: 'Event', value: displayEvent, mono: false },
                ] as const
              ).map(({ label, value, mono }) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <span className="shrink-0 text-emerald-100/60">{label}</span>
                  <span className={cn('min-w-0 break-all text-right', mono && 'font-mono text-xs')}>
                    {value}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t border-emerald-500/20 px-4 py-2.5 font-semibold">
                <span className="shrink-0 text-emerald-100/60">Amount Paid</span>
                <span className="text-emerald-300">{displayAmount}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link to="/delegates">View Application</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
          <SectionCard
            title="Registration Summary"
            description="The details below are synchronized from your application draft and current selections."
            icon={Sparkles}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueRow label="Applicant" value={form.watch('applicantName') || 'Not set'} />
              <ValueRow label="Email" value={form.watch('email') || 'Not set'} />
              <ValueRow
                label="Committee"
                value={
                  selectedCommittee
                    ? `${selectedCommittee.abbr} - ${selectedCommittee.name}`
                    : 'Not selected'
                }
              />
              <ValueRow
                label="Event"
                value={
                  selectedEvent
                    ? `${selectedEvent.name} • ${formatDate(selectedEvent.startAt)}`
                    : 'Auto-linked to committee'
                }
              />
              <ValueRow
                label="Country Preference"
                value={
                  readJson<DelegateApplicationDraft>(delegateDraftKey(uid))?.countryPreference
                    ?.firstChoiceCountry || 'Imported from application draft'
                }
              />
              <ValueRow label="Session Status" value={statusMeta[paymentStatus].label} />
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Duplicate Guard
              </p>
              <p className="mt-2">
                Active sessions are locked in local storage. Refreshing the page restores the order
                instead of creating a duplicate.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Committee Selection"
            description="Choose the committee tied to this payment and review its linked event."
            icon={Wallet}
          >
            <div className="space-y-1.5">
              <Label htmlFor="committeeId">Committee</Label>
              <select
                id="committeeId"
                {...form.register('committeeId')}
                className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              >
                <option value="">Select committee</option>
                {availableCommittees.map((committee) => (
                  <option key={committee.id} value={committee.id}>
                    {committee.abbr} - {committee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
              <ValueRow label="Committee Type" value={selectedCommittee?.type ?? 'Not selected'} />
              <ValueRow
                label="Capacity"
                value={selectedCommittee ? formatNumber(selectedCommittee.capacity) : '—'}
              />
              <ValueRow
                label="Linked Event"
                value={selectedEvent ? selectedEvent.name : 'Not selected'}
              />
              <ValueRow
                label="Event Date"
                value={selectedEvent ? formatDate(selectedEvent.startAt) : '—'}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Fee Breakdown"
            description="Calculated based on your selected committee and event."
            icon={CreditCard}
          >
            {!selectedCommittee || !selectedEvent ? (
              <p className="text-sm text-muted-foreground py-2">
                Select a committee above to see the fee breakdown.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <ValueRow label="Base Registration" value={`₹${fees.baseFee.toLocaleString()}`} />
                  <ValueRow
                    label={`Committee Fee (${selectedCommittee.abbr})`}
                    value={`₹${fees.committeeFee.toLocaleString()}`}
                  />
                  <ValueRow label="Delegate Kit" value={`₹${fees.kitFee.toLocaleString()}`} />
                  <ValueRow label="Gateway Fee" value={`₹${fees.serviceFee.toLocaleString()}`} />
                  {fees.discount > 0 && (
                    <ValueRow label="Discount" value={`-₹${fees.discount.toLocaleString()}`} />
                  )}
                  <ValueRow label="GST (18%)" value={`₹${fees.tax.toLocaleString()}`} />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-gold-300">Total Due</p>
                    <p className="text-sm text-gold-100">Including taxes and processing</p>
                  </div>
                  <p className="text-2xl font-semibold text-gold-300">
                    ₹{fees.total.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Payment Form"
            description="Complete the payment information and lock the order before moving to the gateway."
            icon={ShieldCheck}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="applicantName">Applicant Name</Label>
                <Input
                  id="applicantName"
                  {...form.register('applicantName')}
                  placeholder="Alexandra Chen"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="alexandra@example.com"
                />
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
                  <option value="netbanking">Net Banking</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingName">Billing Name</Label>
                <Input
                  id="billingName"
                  {...form.register('billingName')}
                  placeholder="Alexandra Chen"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="couponCode">Coupon Code</Label>
                <Input
                  id="couponCode"
                  {...form.register('couponCode')}
                  placeholder="Optional promo code"
                />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-white/[0.12] bg-navy-800 text-gold-500 focus:ring-gold-500/50"
                  {...form.register('consent')}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    I confirm the registration summary and amount are correct.
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Orders are locked locally to prevent duplicate submissions.
                  </span>
                </span>
              </label>
            </div>

            <CardFooter className="flex flex-col gap-3 px-0 pb-0 pt-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={13} className="text-gold-400" />
                <span>{infoMessage}</span>
              </div>
              {formError && <p className="text-xs text-red-400 w-full">{formError}</p>}
              <Button
                onClick={onSubmit}
                disabled={paymentMutation.isPending || hasActiveLock}
                className="w-full sm:w-auto"
              >
                {paymentMutation.isPending
                  ? 'Processing…'
                  : hasActiveLock
                    ? 'Resume Existing Order'
                    : 'Pay Securely'}
              </Button>
            </CardFooter>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <PaymentStatusCard status={paymentStatus} session={session} />

          <Card className="glass-card border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-base">Recovery Flow</CardTitle>
              <CardDescription>
                Recover from refreshes, failed payments, or locked sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={resumeSavedSession}
                disabled={!session || paymentStatus === 'success'}
              >
                <RefreshCw size={14} /> Resume Saved Session
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={retryFailedPayment}
                disabled={!hasFailedSession || paymentMutation.isPending}
              >
                <RotateCcw size={14} /> Retry Failed Payment
              </Button>
              <Button variant="secondary" className="w-full" onClick={startFresh}>
                <TimerReset size={14} /> Start Fresh
              </Button>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-gold-400">
                  <AlertTriangle size={13} /> Duplicate order protection is active
                </div>
                <p className="mt-2">
                  If an order is already pending or processing, the app restores it instead of
                  creating a new one.
                </p>
                {lastRecoveryAction && (
                  <p className="mt-2 text-foreground">Last recovery action: {lastRecoveryAction}</p>
                )}
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
              <p>
                Refreshing the page restores the payment session and preserves the current order ID.
              </p>
              <p>Closed or failed checkout attempts remain recoverable from this panel.</p>
            </CardContent>
          </Card>

          {session?.status === 'failed' && (
            <Card className="glass-card border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-base text-red-200">Failure Recovery</CardTitle>
                <CardDescription className="text-red-100/70">
                  This payment failed and can be retried without creating a duplicate order.
                </CardDescription>
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
                <CardDescription className="text-emerald-100/70">
                  Order locked successfully with no duplicate submissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-emerald-100/80">
                <p>Receipt: {toDisplayString(session.receiptId, 'Confirmed')}</p>
                <p>
                  You can safely leave this page or continue to another section of the dashboard.
                </p>
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
