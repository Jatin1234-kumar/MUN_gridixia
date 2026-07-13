import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Flag,
  CreditCard,
  Mail,
  MapPinned,
  Printer,
  ScanLine,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

type PassData = {
  ticketNumber: string | null;
  registrationNumber: string;
  registrationStatus: string;
  paymentStatus: string;
  assignedCommittee: string | null;
  committeeAbbr: string | null;
  assignedCountry: string | null;
  submittedAt: string;
  qrToken: string | null;
  ticketStatus: string | null;
};

type PassStatus = 'valid' | 'pending' | 'used' | 'expired';

function usePassData(authLoading: boolean, isAuthenticated: boolean, userId?: string) {
  const [data, setData] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Keep the skeleton visible while auth is still hydrating from the refresh
    // cookie. Without this guard the hook sees isAuthenticated=false on first
    // render and immediately resolves to null, flashing the "Pending" state.
    if (authLoading) return;

    if (!isAuthenticated || !userId) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setData(null);
    setLoading(true);

    api
      .get<{ data: PassData }>(`/delegates/pass?t=${Date.now()}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      .then((res) => setData(res.data.data))
      .catch((error) => {
        if (error.name !== 'CanceledError') setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authLoading, isAuthenticated, userId]);

  return { data, loading: authLoading || loading };
}

function getPassStatus(passData: PassData | null): PassStatus {
  if (!passData?.ticketNumber) return 'pending';
  if (passData.paymentStatus !== 'paid') return 'pending';
  if (passData.ticketStatus === 'used') return 'used';
  if (passData.ticketStatus === 'cancelled' || passData.ticketStatus === 'revoked')
    return 'expired';
  return 'valid';
}

const passStatusConfig: Record<
  PassStatus,
  { label: string; variant: 'active' | 'pending' | 'inactive' | 'urgent' }
> = {
  valid: { label: 'Valid', variant: 'active' },
  pending: { label: 'Pending', variant: 'pending' },
  used: { label: 'Used', variant: 'inactive' },
  expired: { label: 'Expired', variant: 'urgent' },
};

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

function AllocationField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: passData, loading } = usePassData(authLoading, isAuthenticated, user?.id);
  const [isDownloading, setIsDownloading] = useState(false);

  const ticket = passData?.ticketNumber ?? 'DP-PENDING';
  const country = passData?.assignedCountry ?? 'Pending assignment';
  const committee = passData?.assignedCommittee ?? 'Awaiting committee';
  const delegateName = user?.email ?? 'Delegate Pending';
  const allocationDate = passData?.submittedAt ?? new Date().toISOString();
  const qrValue = useMemo(
    () => [ticket, committee, country, delegateName].join('|'),
    [ticket, committee, country, delegateName],
  );

  const isApprovedRegistration = ['approved', 'confirmed', 'checked_in'].includes(
    passData?.registrationStatus ?? '',
  );
  const isPending = passData?.paymentStatus !== 'paid' || !isApprovedRegistration;
  const passStatus = getPassStatus(passData);
  const statusConfig = passStatusConfig[passStatus];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!passData) return;
    setIsDownloading(true);

    try {
      const passSvg = buildPassMarkup();
      const passBlob = new Blob([passSvg], { type: 'image/svg+xml;charset=utf-8' });
      const passUrl = URL.createObjectURL(passBlob);
      const passImage = new Image();

      passImage.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1400;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(passUrl);
          setIsDownloading(false);
          return;
        }

        ctx.drawImage(passImage, 0, 0, 1400, 900);
        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(passUrl);
            setIsDownloading(false);
            return;
          }

          const downloadUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = `${ticket}.png`;
          anchor.click();
          URL.revokeObjectURL(downloadUrl);
          URL.revokeObjectURL(passUrl);
          setIsDownloading(false);
        }, 'image/png');
      };

      passImage.onerror = () => {
        URL.revokeObjectURL(passUrl);
        const downloadBlob = new Blob([passSvg], { type: 'image/svg+xml;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(downloadBlob);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = `${ticket}.svg`;
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
        setIsDownloading(false);
      };

      passImage.src = passUrl;
    } catch {
      setIsDownloading(false);
    }
  };

  function buildPassMarkup() {
    const name = delegateName;
    const countryVal = country;
    const committeeVal = committee;
    const ticketVal = ticket;
    const dateVal = allocationDate;
    const qrVal = qrValue;

    const qrDataUrl = generateQrDataUrl(qrVal);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111f"/>
      <stop offset="60%" stop-color="#0d1b2d"/>
      <stop offset="100%" stop-color="#15243a"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="900" rx="40" fill="url(#bg)"/>
  <rect x="48" y="48" width="1304" height="804" rx="34" fill="#f5efe2" opacity="0.98"/>
  <rect x="72" y="72" width="1256" height="756" rx="28" fill="#ffffff"/>
  <rect x="72" y="72" width="1256" height="126" rx="28" fill="#09131f"/>
  <rect x="72" y="180" width="1256" height="648" rx="0" fill="#ffffff"/>
  <rect x="72" y="180" width="1256" height="10" fill="#d4af37"/>
  <text x="114" y="122" fill="#f8f4ea" font-family="Inter, Arial, sans-serif" font-size="26" letter-spacing="6">DELEGATE PASS</text>
  <text x="114" y="157" fill="#d4af37" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">MUN GRIDIXIA CONFERENCE ACCESS</text>
  <text x="114" y="268" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">DELEGATE NAME</text>
  <text x="114" y="320" fill="#07111f" font-family="Georgia, serif" font-size="54" font-weight="700">${escapeXml(name)}</text>
  <text x="114" y="386" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">COMMITTEE</text>
  <text x="114" y="426" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(committeeVal)}</text>
  <text x="114" y="488" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">COUNTRY</text>
  <text x="114" y="528" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(countryVal)}</text>
  <text x="114" y="618" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">TICKET NUMBER</text>
  <text x="114" y="660" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(ticketVal)}</text>
  <text x="114" y="736" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">ALLOCATION DATE</text>
  <text x="114" y="770" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">${escapeXml(formatDate(dateVal))}</text>
  <rect x="796" y="232" width="492" height="492" rx="30" fill="#faf7f0" stroke="#eadfc4" stroke-width="2"/>
  <image x="846" y="282" width="392" height="392" href="${qrDataUrl}"/>
  <text x="1042" y="744" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">SCAN TO VERIFY</text>
  <rect x="796" y="760" width="492" height="72" rx="18" fill="#f4ead1"/>
  <text x="1042" y="804" fill="#07111f" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">ISSUED BY MUN GRIDIXIA OPERATIONS</text>
</svg>`;
  }

  useEffect(() => {
    setIsDownloading(false);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Delegate Pass" subtitle="Conference access pass with QR verification" />
        <PassSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Delegate Pass"
        subtitle="Conference entry pass with scannable QR code and wallet integration"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={isDownloading}>
              <Download size={14} />
              {isDownloading ? 'Exporting…' : 'Download'}
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
        <motion.div
          className="xl:col-span-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-navy-900/50 border border-white/[0.05] rounded-2xl p-6 text-white">
            {/* Card header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.36em] text-white/50">
                  Delegate Access
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Conference Entry Card</h2>
                <p className="mt-2 max-w-xl text-sm text-white/65">
                  Present this pass at check-in. It keeps your delegate identity, committee
                  assignment, and QR verification in one polished view.
                </p>
              </div>
              <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-300">
                  Ticket Number
                </p>
                <p className="mt-1 text-xl font-semibold text-gold-200">{ticket}</p>
              </div>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                <Badge variant="default">Conference Entry</Badge>
              </div>

              <div className="space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-gold-500/[0.06] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-gold-500/20 bg-gold-500/10 text-3xl shadow-inner shadow-gold-500/10">
                    {country === 'Pending assignment' ? '\u{1F3F3}\uFE0F' : '\u{1F3DB}\uFE0F'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                      Delegate Name
                    </p>
                    <h3 className="mt-2 truncate text-3xl font-semibold text-white sm:text-4xl">
                      {delegateName}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="mun">Professional Conference</Badge>
                      <Badge variant={isPending ? 'pending' : 'active'}>
                        {isPending ? 'Awaiting allocation' : 'Verified'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <AllocationField label="Committee" value={committee} icon={MapPinned} />
                  <AllocationField label="Country" value={country} icon={Flag} />
                  <AllocationField label="Ticket Number" value={ticket} icon={Ticket} />
                  <AllocationField
                    label="Allocation Date"
                    value={formatDate(allocationDate)}
                    icon={CreditCard}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                    <UserRound className="h-3.5 w-3.5 text-gold-300" />
                    Delegate
                  </div>
                  <p className="mt-3 text-sm text-white">{delegateName}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                    <Wallet className="h-3.5 w-3.5 text-gold-300" />
                    Session
                  </div>
                  <p className="mt-3 text-sm text-white">
                    {passData?.registrationNumber || 'Pending receipt'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                    <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
                    Status
                  </div>
                  <p className="mt-3 text-sm text-white capitalize">{passStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* QR pass card */}
        <div className="xl:col-span-5 w-full max-w-[400px] mx-auto bg-white text-neutral-900 rounded-2xl p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">QR Code</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                Scan at entry for verification
              </p>
            </div>
            <ScanLine className="h-5 w-5 text-slate-400" />
          </div>

          <div className="w-full flex items-center justify-center rounded-[26px] bg-[#faf7f0] p-4">
            <QRCodeSVG
              value={qrValue}
              size={200}
              bgColor="#ffffff"
              fgColor="#07111f"
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="mt-4 grid w-full gap-3 grid-cols-2">
            <InfoChip label="Committee" value={committee} />
            <InfoChip label="Country" value={country} />
            <InfoChip label="Ticket" value={ticket} />
            <InfoChip label="Date" value={formatDate(allocationDate)} />
          </div>
        </div>

        <div className="xl:col-span-12 space-y-4 print:hidden">
          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Pass Summary</CardTitle>
                  <CardDescription>
                    Conference-appropriate metadata for quick confirmation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <SummaryRow label="Delegate" value={delegateName} />
              <SummaryRow label="Committee" value={committee} />
              <SummaryRow label="Country" value={country} />
              <SummaryRow label="Ticket" value={ticket} />
              <SummaryRow label="Receipt" value={passData?.registrationNumber || 'Pending'} />
              <SummaryRow label="Status" value={statusConfig.label} />
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Wallet & Delivery</CardTitle>
                  <CardDescription>Add to your phone wallet or receive via email.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <Button className="w-full justify-start gap-2" variant="outline" disabled>
                <Wallet size={14} />
                Add to Apple Wallet
                <Badge variant="inactive" className="ml-auto text-[9px]">
                  Coming Soon
                </Badge>
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled>
                <Wallet size={14} />
                Add to Google Wallet
                <Badge variant="inactive" className="ml-auto text-[9px]">
                  Coming Soon
                </Badge>
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" disabled>
                <Mail size={14} />
                Email Pass to Delegate
                <Badge variant="inactive" className="ml-auto text-[9px]">
                  Coming Soon
                </Badge>
              </Button>
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
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download size={14} />
                {isDownloading ? 'Exporting…' : 'Download Pass'}
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
      {/* end outer grid */}

      {isPending && (
        <Card className="border-amber-500/20 bg-amber-500/10 text-amber-100 print:hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">Delegate pass pending</p>
              <p className="mt-1 text-sm text-amber-100/75">
                Complete the application or payment session to unlock the finalized pass.
              </p>
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

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateQrDataUrl(value: string): string {
  const size = 300;
  const cellCount = 29;
  const cellSize = size / (cellCount + 2);
  const padding = cellSize;

  let rects = '';
  const hash = simpleHash(value);
  let cursor = hash || 1;

  for (let row = 0; row < cellCount; row++) {
    for (let col = 0; col < cellCount; col++) {
      const isFinderArea =
        (row < 7 && col < 7) ||
        (row < 7 && col >= cellCount - 7) ||
        (row >= cellCount - 7 && col < 7);

      if (isFinderArea) {
        const isBorder =
          row === 0 ||
          row === 6 ||
          col === 0 ||
          col === 6 ||
          row === cellCount - 7 ||
          row === cellCount - 1 ||
          col === cellCount - 7 ||
          col === cellCount - 1 ||
          (row < 7 && col >= cellCount - 7 && (col === cellCount - 7 || col === cellCount - 1)) ||
          (row >= cellCount - 7 && col < 7 && (row === cellCount - 7 || row === cellCount - 1));
        const isCenter =
          (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
          (row >= 2 && row <= 4 && col >= cellCount - 5 && col <= cellCount - 3) ||
          (row >= cellCount - 5 && row <= cellCount - 3 && col >= 2 && col <= 4);

        if (isBorder || isCenter) {
          rects += `<rect x="${padding + col * cellSize}" y="${padding + row * cellSize}" width="${cellSize}" height="${cellSize}" fill="#07111f"/>`;
        }
        continue;
      }

      cursor = (cursor * 1664525 + 1013904223) >>> 0;
      if (((cursor >> 24) & 1) === 1 || ((row + col + hash) % 3 === 0 && (cursor & 3) === 0)) {
        rects += `<rect x="${padding + col * cellSize}" y="${padding + row * cellSize}" width="${cellSize}" height="${cellSize}" rx="1" fill="#07111f"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function simpleHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
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
