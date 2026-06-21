import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Flag,
  IdCard,
  MapPinned,
  Printer,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import type { DelegateApplicationDraft, PaymentSession } from '@/types';

const delegateDraftKey = 'mun-gridixia:delegate-application-draft:v1';
const paymentSessionKey = 'mun-gridixia:payment-session:v1';

type PassState = {
  draft?: Partial<DelegateApplicationDraft>;
  session?: PaymentSession;
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

function usePassState() {
  const [state, setState] = useState<PassState | null>(null);

  useEffect(() => {
    setState({
      draft: readJson<DelegateApplicationDraft>(delegateDraftKey),
      session: readJson<PaymentSession>(paymentSessionKey),
    });
  }, []);

  return state;
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createQrMatrix(seed: string, size = 29) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  const drawFinder = (startRow: number, startCol: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const isBorder = row === 0 || row === 6 || col === 0 || col === 6;
        const isCenter = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[startRow + row][startCol + col] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  const hash = hashString(seed);
  let cursor = hash || 1;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder = row < 7 && col < 7 || row < 7 && col >= size - 7 || row >= size - 7 && col < 7;
      if (inFinder) continue;
      cursor = (cursor * 1664525 + 1013904223) >>> 0;
      matrix[row][col] = ((cursor >> 24) & 1) === 1 || ((row + col + hash) % 3 === 0 && (cursor & 3) === 0);
    }
  }

  return matrix;
}

function buildQrSvg(matrix: boolean[]) {
  return matrix;
}

function generateQrMarkup(seed: string) {
  const matrix = createQrMatrix(seed);
  const size = matrix.length;
  const cell = 8;
  const padding = 20;
  const dimension = size * cell + padding * 2;
  const dark = '#07111f';
  const gold = '#d4af37';

  const squares: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!matrix[row][col]) continue;
      squares.push(`<rect x="${padding + col * cell}" y="${padding + row * cell}" width="${cell}" height="${cell}" rx="1.5" fill="${dark}" />`);
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 ${dimension} ${dimension}">
      <rect width="100%" height="100%" rx="28" fill="#f7f2e8" />
      <rect x="10" y="10" width="${dimension - 20}" height="${dimension - 20}" rx="24" fill="#ffffff" stroke="${gold}" stroke-width="2" />
      ${squares.join('')}
      <circle cx="${dimension / 2}" cy="${dimension / 2}" r="18" fill="#ffffff" />
      <circle cx="${dimension / 2}" cy="${dimension / 2}" r="8" fill="${gold}" />
    </svg>`;
}

function buildPassMarkup(state: Required<Pick<PassState, 'draft' | 'session'>>) {
  const country = state.draft.countryPreference.firstChoiceCountry || 'Pending';
  const committee = state.session.committeeName || state.draft.committeePreference.preferredCommitteeName || 'Unassigned';
  const ticketNumber = state.session.orderId ? `DP-${state.session.orderId.slice(-8).toUpperCase()}` : 'DP-PENDING';
  const qrMarkup = generateQrMarkup([ticketNumber, committee, country].join('|'));
  const date = state.session.createdAt || new Date().toISOString();

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#07111f" />
          <stop offset="60%" stop-color="#0d1b2d" />
          <stop offset="100%" stop-color="#15243a" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f2d57d" />
          <stop offset="100%" stop-color="#c79b1f" />
        </linearGradient>
      </defs>
      <rect width="1400" height="900" rx="40" fill="url(#bg)" />
      <rect x="48" y="48" width="1304" height="804" rx="34" fill="#f5efe2" opacity="0.98" />
      <rect x="72" y="72" width="1256" height="756" rx="28" fill="#ffffff" />
      <rect x="72" y="72" width="1256" height="126" rx="28" fill="#09131f" />
      <rect x="72" y="180" width="1256" height="648" rx="0" fill="#ffffff" />
      <rect x="72" y="180" width="1256" height="10" fill="url(#gold)" />
      <text x="114" y="122" fill="#f8f4ea" font-family="Inter, Arial, sans-serif" font-size="26" letter-spacing="6">DELEGATE PASS</text>
      <text x="114" y="157" fill="#d4af37" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">MUN GRIDIXIA CONFERENCE ACCESS</text>

      <text x="114" y="268" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">DELEGATE NAME</text>
      <text x="114" y="320" fill="#07111f" font-family="Georgia, serif" font-size="54" font-weight="700">${state.draft.personal.fullName || 'Pending Delegate'}</text>

      <text x="114" y="386" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">COMMITTEE</text>
      <text x="114" y="426" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">${committee}</text>

      <text x="114" y="488" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">COUNTRY</text>
      <text x="114" y="528" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">${country}</text>

      <text x="114" y="618" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">TICKET NUMBER</text>
      <text x="114" y="660" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="700">${ticketNumber}</text>

      <text x="114" y="736" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">ALLOCATION DATE</text>
      <text x="114" y="770" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">${formatDate(date)}</text>

      <rect x="796" y="232" width="492" height="492" rx="30" fill="#faf7f0" stroke="#eadfc4" stroke-width="2" />
      <g transform="translate(840 276)">${qrMarkup.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
      <text x="1018" y="744" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">SCAN TO VERIFY</text>

      <rect x="796" y="760" width="492" height="72" rx="18" fill="#f4ead1" />
      <text x="840" y="804" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">ISSUED BY MUN GRIDIXIA OPERATIONS</text>
      <text x="1242" y="804" fill="#d4af37" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">${formatNumber(state.session.attempts)} ATTEMPTS</text>
    </svg>`;
}

function PassSkeleton() {
  return (
    <Card className="overflow-hidden border-white/[0.08] bg-[#09131f] text-white shadow-2xl shadow-black/30">
      <CardHeader className="border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <LoadingSpinner size="sm" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-3 w-72 rounded-full bg-white/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="h-4 w-24 rounded-full bg-white/10" />
          <div className="h-14 w-full rounded-2xl bg-white/5" />
          <div className="h-14 w-full rounded-2xl bg-white/5" />
          <div className="h-14 w-full rounded-2xl bg-white/5" />
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#f7f2e8] p-5">
          <div className="h-[360px] rounded-[24px] bg-white shadow-inner" />
        </div>
      </CardContent>
    </Card>
  );
}

function AllocationField({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-gold-400" />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function DelegatePass() {
  const state = usePassState();
  const [isPrinting, setIsPrinting] = useState(false);

  const ticket = useMemo(() => {
    const orderId = state?.session?.orderId;
    return orderId ? `DP-${orderId.slice(-8).toUpperCase()}` : 'DP-PENDING';
  }, [state?.session?.orderId]);

  const country = state?.draft?.countryPreference.firstChoiceCountry || 'Pending assignment';
  const committee = state?.session?.committeeName || state?.draft?.committeePreference.preferredCommitteeName || 'Awaiting committee';
  const delegateName = state?.session?.applicantName || state?.draft?.personal.fullName || 'Delegate Pending';
  const allocationDate = state?.session?.createdAt || new Date().toISOString();
  const qrSeed = [ticket, committee, country, delegateName].join('|');

  const loading = !state;
  const isPending = !state?.session?.orderId || !state?.session?.committeeName || !state?.draft?.countryPreference.firstChoiceCountry;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!state?.draft || !state?.session) return;

    const svg = buildPassMarkup({ draft: state.draft, session: state.session });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }

      context.drawImage(image, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          URL.revokeObjectURL(url);
          return;
        }

        const downloadUrl = URL.createObjectURL(pngBlob);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = `${ticket}.png`;
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    image.src = url;
  };

  useEffect(() => {
    setIsPrinting(false);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Delegate Pass" subtitle="Airline boarding pass inspired conference access" />
        <PassSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Delegate Pass"
        subtitle="Airline boarding pass meets Apple Wallet, tailored for a professional conference entry card"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download size={14} />
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer size={14} />
              Print
            </Button>
            <Button size="sm" asChild>
              <a href="/country-allocation">View Allocation</a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="overflow-hidden border-white/[0.08] bg-[#08111d] text-white shadow-2xl shadow-black/30 print:shadow-none">
            <CardHeader className="border-b border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardDescription className="text-[10px] uppercase tracking-[0.36em] text-white/50">Delegate Access</CardDescription>
                  <CardTitle className="mt-2 text-2xl text-white">Boarding Pass Style Entry Card</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm text-white/65">Present this pass at check-in. It keeps your delegate identity, committee assignment, and QR verification in one polished view.</p>
                </div>
                <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-gold-300">Ticket Number</p>
                  <p className="mt-1 text-xl font-semibold text-gold-200">{ticket}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-5 px-5 py-6 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isPending ? 'pending' : 'active'}>{isPending ? 'Pending pass readiness' : 'Pass ready'}</Badge>
                  <Badge variant="default">Conference Entry</Badge>
                </div>

                <div className="space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-gold-500/[0.06] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-gold-500/20 bg-gold-500/10 text-3xl shadow-inner shadow-gold-500/10">
                      {country === 'Pending assignment' ? '🏳️' : '🏛️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Delegate Name</p>
                      <h2 className="mt-2 truncate text-3xl font-semibold text-white sm:text-4xl">{delegateName}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="mun">Professional Conference</Badge>
                        <Badge variant={isPending ? 'pending' : 'active'}>{isPending ? 'Awaiting allocation' : 'Verified'}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <AllocationField label="Committee" value={committee} icon={MapPinned} />
                    <AllocationField label="Country" value={country} icon={Flag} />
                    <AllocationField label="Ticket Number" value={ticket} icon={Ticket} />
                    <AllocationField label="Allocation Date" value={formatDate(allocationDate)} icon={IdCard} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/45">
                      <UserRound className="h-3.5 w-3.5 text-gold-300" />
                      Delegate
                    </div>
                    <p className="mt-3 text-sm text-white">{delegateName}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/45">
                      <Wallet className="h-3.5 w-3.5 text-gold-300" />
                      Session
                    </div>
                    <p className="mt-3 text-sm text-white">{state.session?.receiptId || 'Pending receipt'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/45">
                      <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
                      Status
                    </div>
                    <p className="mt-3 text-sm text-white">{isPending ? 'Pending' : 'Confirmed'}</p>
                  </div>
                </div>
              </div>

              <div className="relative border-t border-white/10 bg-[#f7f2e8] px-5 py-6 text-[#07111f] lg:border-t-0 lg:border-l lg:px-6 print:bg-white">
                <div className="absolute left-0 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#08111d] lg:block" />
                <div className="absolute right-0 top-1/2 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#08111d] lg:block" />

                <div className="rounded-[30px] border border-[#eadfc4] bg-white p-4 shadow-[0_18px_36px_rgba(7,17,31,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">QR Code</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">Scan at entry for verification</p>
                    </div>
                    <ScanLine className="h-5 w-5 text-slate-500" />
                  </div>

                  <div className="mt-4 flex items-center justify-center rounded-[26px] bg-[#faf7f0] p-4">
                    <QrPanel seed={qrSeed} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoChip label="Committee" value={committee} />
                    <InfoChip label="Country" value={country} />
                    <InfoChip label="Ticket" value={ticket} />
                    <InfoChip label="Date" value={formatDate(allocationDate)} />
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] border border-[#eadfc4] bg-[#f4ead1] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Mobile View</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">Optimized for phone wallets and compact display</p>
                    </div>
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-4 print:hidden">
          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <IdCard className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Pass Summary</CardTitle>
                  <CardDescription>Conference-appropriate metadata for quick confirmation.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <SummaryRow label="Delegate" value={delegateName} />
              <SummaryRow label="Committee" value={committee} />
              <SummaryRow label="Country" value={country} />
              <SummaryRow label="Ticket" value={ticket} />
              <SummaryRow label="Receipt" value={state.session?.receiptId || 'Pending'} />
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Printer className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Actions</CardTitle>
                  <CardDescription>Download, print, or jump back to allocation.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <Button className="w-full justify-start" variant="outline" onClick={handleDownload}>
                <Download size={14} />
                Download Pass
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={handlePrint}>
                <Printer size={14} />
                Print Pass
              </Button>
              <Button className="w-full justify-start" asChild>
                <a href="/country-allocation">Open Allocation View</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {isPending && (
        <Card className="border-amber-500/20 bg-amber-500/10 text-amber-100 print:hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">Delegate pass pending</p>
              <p className="mt-1 text-sm text-amber-100/75">Complete the application or payment session to unlock the finalized pass.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href="/delegates">Resume Application</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QrPanel({ seed }: { seed: string }) {
  const matrix = createQrMatrix(seed);
  const size = matrix.length;
  const cells = [] as JSX.Element[];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!matrix[row][col]) continue;
      cells.push(
        <rect key={`${row}-${col}`} x={col * 8 + 20} y={row * 8 + 20} width={8} height={8} rx={1.4} fill="#07111f" />,
      );
    }
  }

  return (
    <svg width={size * 8 + 40} height={size * 8 + 40} viewBox={`0 0 ${size * 8 + 40} ${size * 8 + 40}`} className="max-w-full">
      <rect width="100%" height="100%" rx="28" fill="#faf7f0" />
      <rect x="10" y="10" width={size * 8 + 20} height={size * 8 + 20} rx="24" fill="#ffffff" stroke="#d4af37" strokeWidth="2" />
      {cells}
      <circle cx={size * 4 + 20} cy={size * 4 + 20} r="9" fill="#d4af37" />
    </svg>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfc4] bg-white px-4 py-3 text-sm text-slate-900">
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}