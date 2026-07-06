import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { readJson, writeJson } from '@/lib/storage';
import type { DelegateApplicationDraft, PaymentSession } from '@/types';

const delegateDraftKey = 'mun-gridixia:delegate-application-draft:v1';
const paymentSessionKey = 'mun-gridixia:payment-session:v1';
const checkInLedgerKey = 'mun-gridixia:checkin-ledger:v1';

type CheckInRecord = {
  ticketNumber: string;
  checkedInAt: string;
  delegateName: string;
  committee: string;
  country: string;
  rawValue: string;
};

type ScannerStatus = 'loading' | 'ready' | 'success' | 'error' | 'already-checked-in';

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

type LocalWindow = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function useCheckInContext() {
  const [draft, setDraft] = useState<Partial<DelegateApplicationDraft> | undefined>(undefined);
  const [session, setSession] = useState<PaymentSession | undefined>(undefined);

  useEffect(() => {
    setDraft(readJson<DelegateApplicationDraft>(delegateDraftKey));
    setSession(readJson<PaymentSession>(paymentSessionKey));
  }, []);

  return { draft, session };
}

function loadLedger(): Record<string, CheckInRecord> {
  return readJson<Record<string, CheckInRecord>>(checkInLedgerKey) ?? {};
}

function saveLedger(ledger: Record<string, CheckInRecord>) {
  writeJson(checkInLedgerKey, ledger);
}

function ticketNumberFromSession(session?: PaymentSession) {
  const orderId = session?.orderId;
  return orderId ? `DP-${orderId.slice(-8).toUpperCase()}` : 'DP-PENDING';
}

function generateSuccessTone() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, context.currentTime + 0.15);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.23);
    oscillator.onended = () => context.close();
  } catch {
    // Silent fallback when audio is unavailable.
  }
}

function CameraFrame({ status, message }: { status: ScannerStatus; message: string }) {
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border bg-[#06101d] shadow-2xl shadow-black/35',
        isSuccess ? 'border-emerald-500/30' : isError ? 'border-red-500/30' : 'border-white/[0.08]',
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.16),transparent_55%)]" />
      <div className="absolute inset-4 rounded-[24px] border border-white/10" />
      <div className="absolute left-4 top-4 h-10 w-10 rounded-tl-[18px] border-l-2 border-t-2 border-white/30" />
      <div className="absolute right-4 top-4 h-10 w-10 rounded-tr-[18px] border-r-2 border-t-2 border-white/30" />
      <div className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-[18px] border-b-2 border-l-2 border-white/30" />
      <div className="absolute bottom-4 right-4 h-10 w-10 rounded-br-[18px] border-b-2 border-r-2 border-white/30" />

      <div
        className={cn(
          'absolute inset-0 transition-colors duration-300',
          isSuccess && 'bg-emerald-500/10',
          isError && 'bg-red-500/10',
        )}
      />

      <div className="relative z-10 flex min-h-[320px] flex-col justify-between p-5 sm:min-h-[420px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/60">
              Live Camera View
            </p>
            <p className="mt-2 text-sm text-white/70">
              Align the delegate QR inside the frame for instant check-in.
            </p>
          </div>
          <Badge variant={isSuccess ? 'active' : isError ? 'urgent' : 'pending'}>
            {isSuccess ? 'Verified' : isError ? 'Error' : 'Scanning'}
          </Badge>
        </div>

        <div className="flex items-center justify-center">
          <div
            className={cn(
              'relative aspect-[3/4] w-full max-w-[430px] overflow-hidden rounded-[24px] border border-white/10 bg-black/60',
              isSuccess && 'ring-2 ring-emerald-400/60',
              isError && 'ring-2 ring-red-400/60',
            )}
          >
            <video
              id="checkin-video"
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-0">
              <div
                className={cn(
                  'absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border-2',
                  isSuccess
                    ? 'border-emerald-400/70 shadow-[0_0_0_9999px_rgba(16,185,129,0.12)]'
                    : isError
                      ? 'border-red-400/70 shadow-[0_0_0_9999px_rgba(239,68,68,0.12)]'
                      : 'border-gold-400/70 shadow-[0_0_0_9999px_rgba(212,175,55,0.08)]',
                )}
              />
              <div className="absolute left-1/2 top-[14%] h-[72%] w-1 -translate-x-1/2 bg-gradient-to-b from-transparent via-gold-300/80 to-transparent opacity-70 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Scanner</p>
            <p className="mt-2 text-sm text-white">Native QR detection</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Overlay</p>
            <p className="mt-2 text-sm text-white">
              {isSuccess
                ? 'Green verification lane'
                : isError
                  ? 'Red rejection lane'
                  : 'Centered camera guide'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Status</p>
            <p className="mt-2 text-sm text-white">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-gold-400" />
        {title}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function CheckInScanner() {
  const { draft, session } = useCheckInContext();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanLockRef = useRef(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('loading');
  const [message, setMessage] = useState('Starting camera...');
  const [errorMessage, setErrorMessage] = useState('');
  const [record, setRecord] = useState<CheckInRecord | undefined>(undefined);

  const delegateName = session?.applicantName || draft?.personal?.fullName || 'Delegate Pending';
  const committeeName =
    session?.committeeName ||
    draft?.committeePreference?.preferredCommitteeName ||
    'Awaiting committee';
  const country = draft?.countryPreference?.firstChoiceCountry || 'Awaiting country';
  const ticket = ticketNumberFromSession(session);
  const canCheckIn = session?.status === 'success';

  const existingRecord = useMemo(() => loadLedger()[ticket], [ticket]);

  useEffect(() => {
    setRecord(existingRecord);
    if (existingRecord) {
      setScannerStatus('already-checked-in');
      setMessage('This delegate has already been checked in.');
      return;
    }

    if (!canCheckIn) {
      setScannerStatus('error');
      setErrorMessage('Delegate pass not verified yet. Complete payment before check-in.');
      setMessage('Check-in is locked until the delegate pass is confirmed.');
      return;
    }

    let cancelled = false;

    async function startCamera() {
      // attach videoRef to the DOM element
      videoRef.current = document.getElementById('checkin-video') as HTMLVideoElement | null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const Detector = (window as LocalWindow).BarcodeDetector;
        if (!Detector) {
          setScannerStatus('error');
          setErrorMessage('This browser does not support live QR decoding.');
          setMessage('Camera is ready, but QR decoding is unavailable here.');
          return;
        }

        detectorRef.current = new Detector({ formats: ['qr_code'] });
        setScannerStatus('ready');
        setMessage('Camera active. Hold a QR code inside the frame.');

        scanTimerRef.current = window.setInterval(async () => {
          if (scanLockRef.current || !videoRef.current) return;

          try {
            const results = await detectorRef.current?.detect(videoRef.current);
            const rawValue = results?.[0]?.rawValue?.trim();
            if (!rawValue) return;

            const expectedTokens = new Set(
              [ticket, session?.orderId, session?.receiptId, delegateName, committeeName]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase()),
            );

            const matched =
              expectedTokens.has(rawValue.toLowerCase()) ||
              [...expectedTokens].some((token) => rawValue.toLowerCase().includes(token));

            if (!matched) {
              scanLockRef.current = true;
              setScannerStatus('error');
              setErrorMessage('QR code does not match the current delegate pass.');
              setMessage('Scan rejected. Present the correct delegate pass.');
              window.setTimeout(() => {
                scanLockRef.current = false;
                if (!existingRecord) {
                  setScannerStatus('ready');
                  setErrorMessage('');
                  setMessage('Camera active. Hold a QR code inside the frame.');
                }
              }, 1600);
              return;
            }

            const ledger = loadLedger();
            const existing = ledger[ticket];
            if (existing) {
              setRecord(existing);
              setScannerStatus('already-checked-in');
              setMessage('This delegate has already been checked in.');
              scanLockRef.current = true;
              return;
            }

            const checkedInAt = new Date().toISOString();
            const nextRecord: CheckInRecord = {
              ticketNumber: ticket,
              checkedInAt,
              delegateName,
              committee: committeeName,
              country,
              rawValue,
            };

            ledger[ticket] = nextRecord;
            saveLedger(ledger);
            setRecord(nextRecord);
            setScannerStatus('success');
            setMessage('Delegate successfully checked in.');
            generateSuccessTone();
            scanLockRef.current = true;
          } catch {
            setScannerStatus('error');
            setErrorMessage('Unable to decode the QR frame. Try again in better light.');
            setMessage('Scanning error detected.');
          }
        }, 650);
      } catch {
        setScannerStatus('error');
        setErrorMessage('Camera permission was denied or the camera is unavailable.');
        setMessage('Enable camera access to scan delegates.');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCheckIn, existingRecord, ticket]);

  useEffect(() => {
    if (scannerStatus === 'success') {
      setErrorMessage('');
    }
  }, [scannerStatus]);

  const handleRestart = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
    }

    scanLockRef.current = false;
    setErrorMessage('');

    if (record) {
      setScannerStatus('already-checked-in');
      setMessage('This delegate has already been checked in.');
      return;
    }

    setScannerStatus(canCheckIn ? 'ready' : 'error');
    setMessage(
      canCheckIn
        ? 'Camera active. Hold a QR code inside the frame.'
        : 'Check-in is locked until the delegate pass is confirmed.',
    );
  };

  const overlayTone =
    scannerStatus === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : scannerStatus === 'error'
        ? 'border-red-500/30 bg-red-500/10'
        : 'border-gold-500/30 bg-gold-500/10';

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="QR Scanner Interface"
        subtitle="Live camera check-in for delegate verification"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={handleRestart}>
              <RefreshCcw size={14} />
              Restart Scan
            </Button>
            <Button size="sm" asChild>
              <a href="/delegate-pass">Open Delegate Pass</a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {scannerStatus === 'loading' ? (
            <Card className="glass-card border-white/[0.08]">
              <CardContent className="flex min-h-[520px] items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <LoadingSpinner size="lg" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Starting camera</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Requesting permission and preparing QR detection.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CameraFrame status={scannerStatus} message={message} />
          )}
        </motion.div>

        <div className="space-y-4">
          <Card className={cn('overflow-hidden border text-white', overlayTone)}>
            <CardHeader className="border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border',
                    scannerStatus === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : scannerStatus === 'error'
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border-gold-500/30 bg-gold-500/10 text-gold-300',
                  )}
                >
                  {scannerStatus === 'success' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : scannerStatus === 'error' ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <ScanLine className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base text-white">Scanner Status</CardTitle>
                  <CardDescription className="text-white/65">
                    Mobile-optimized check-in workflow
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Message</p>
                <p className="mt-2 text-sm text-white">{errorMessage || message}</p>
              </div>

              {scannerStatus === 'success' && record && (
                <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-200">
                    <UserCheck className="h-3.5 w-3.5" />
                    Success
                  </div>
                  <p className="text-lg font-semibold text-white">{record.delegateName}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailsCard title="Committee" value={record.committee} icon={Wallet} />
                    <DetailsCard title="Country" value={record.country} icon={Sparkles} />
                    <DetailsCard title="Ticket" value={record.ticketNumber} icon={ScanLine} />
                    <DetailsCard
                      title="Checked-In"
                      value={formatTimestamp(record.checkedInAt)}
                      icon={Clock3}
                    />
                  </div>
                  <p className="text-sm text-emerald-100/80">
                    Success sound played and the check-in timestamp has been saved locally.
                  </p>
                </div>
              )}

              {scannerStatus === 'already-checked-in' && record && (
                <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Already Checked In
                  </div>
                  <p className="text-lg font-semibold text-white">{record.delegateName}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailsCard
                      title="Timestamp"
                      value={formatTimestamp(record.checkedInAt)}
                      icon={Clock3}
                    />
                    <DetailsCard title="Ticket" value={record.ticketNumber} icon={ScanLine} />
                  </div>
                  <p className="text-sm text-amber-100/80">
                    This pass was already processed. No duplicate entry was created.
                  </p>
                </div>
              )}

              {scannerStatus === 'error' && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
                  <p className="text-sm font-medium">Error Message</p>
                  <p className="mt-1 text-sm text-red-100/80">{errorMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Delegate Snapshot</CardTitle>
                  <CardDescription>Reference information used for verification.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <DetailsCard title="Delegate" value={delegateName} icon={UserCheck} />
              <DetailsCard title="Committee" value={committeeName} icon={Wallet} />
              <DetailsCard title="Country" value={country} icon={Sparkles} />
              <DetailsCard title="Ticket Number" value={ticket} icon={ScanLine} />
            </CardContent>
          </Card>

          <Card className="glass-card border-white/[0.08]">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {canCheckIn
                    ? 'Camera ready for live scans'
                    : 'Check-in locked until pass verification'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canCheckIn
                    ? 'Scan a valid delegate QR to record attendance instantly.'
                    : 'Open the delegate pass and complete payment first.'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleRestart}>
                <RefreshCcw size={14} />
                Refresh State
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
