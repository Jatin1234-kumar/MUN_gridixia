import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api, { getApiErrorMessage } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckInRecord = {
  ticketNumber: string;
  checkedInAt: string;
  delegateName: string;
  committee: string;
  country: string;
  rawValue: string;
};

type ParsedQR = {
  ticket: string;
  committee: string;
  country: string;
  delegateName: string;
};

type CheckInResponse = {
  status: 'checked_in' | 'already_checked_in';
  ticketNumber: string;
  checkedInAt: string;
  delegateName: string;
  committee: string;
  country: string;
};

type ScannerStatus = 'loading' | 'ready' | 'success' | 'error' | 'already-checked-in' | 'unpaid';

interface BarcodeDetectorResult {
  rawValue: string;
}
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}
type LocalWindow = Window & { BarcodeDetector?: BarcodeDetectorConstructor };

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function generateSuccessTone() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
    osc.onended = () => ctx.close();
  } catch {
    // silent fallback
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CameraFrame({
  status,
  message,
  videoRef,
}: {
  status: ScannerStatus;
  message: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const isSuccess = status === 'success';
  const isError = status === 'error' || status === 'unpaid';

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
              ref={videoRef}
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
              <div className="absolute left-1/2 top-[14%] h-[72%] w-1 -translate-x-1/2 animate-pulse bg-gradient-to-b from-transparent via-gold-300/80 to-transparent opacity-70" />
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

// ── Main component ────────────────────────────────────────────────────────────

export default function CheckInScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const fallbackControlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanLockRef = useRef(false);

  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('loading');
  const [message, setMessage] = useState('Starting camera…');
  const [errorMessage, setErrorMessage] = useState('');
  // Populated only after a successful scan — null on page load
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  // Snapshot shown in the "Last Scanned" card — null until first scan
  const [snapshot, setSnapshot] = useState<ParsedQR | null>(null);

  const processRawValue = useCallback(async (rawValue: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    try {
      const { data } = await api.post<{ data: CheckInResponse }>('/delegates/check-in', { qrToken: rawValue });
      const scan = data.data;
      const nextRecord: CheckInRecord = { ...scan, rawValue };
      setSnapshot({
        ticket: scan.ticketNumber,
        committee: scan.committee,
        country: scan.country,
        delegateName: scan.delegateName,
      });
      setRecord(nextRecord);
      setScannerStatus(scan.status === 'checked_in' ? 'success' : 'already-checked-in');
      setMessage(
        scan.status === 'checked_in'
          ? 'Delegate successfully checked in.'
          : 'This delegate has already been checked in.',
      );
      if (scan.status === 'checked_in') generateSuccessTone();
    } catch (err) {
      setScannerStatus('error');
      setErrorMessage(getApiErrorMessage(err, 'Unable to verify this delegate pass.'));
      setMessage('Scan rejected. Present a valid paid delegate pass.');
      window.setTimeout(() => {
        scanLockRef.current = false;
        setScannerStatus('ready');
        setErrorMessage('');
        setMessage('Camera active. Hold a delegate QR inside the frame.');
      }, 1800);
    }
  }, []);

  // ── Camera bootstrap ───────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    // Stop any existing stream before restarting
    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
    fallbackControlsRef.current?.stop();
    fallbackControlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    scanLockRef.current = false;

    setScannerStatus('loading');
    setMessage('Starting camera…');
    setErrorMessage('');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      setScannerStatus('error');
      setErrorMessage('Camera permission was denied or the camera is unavailable.');
      setMessage('Enable camera access to scan delegates.');
      return;
    }

    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      setScannerStatus('error');
      setErrorMessage('Camera preview could not be initialized. Restart the scanner and try again.');
      return;
    }

    video.srcObject = stream;
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Camera stream timed out')), 8_000);
        video.onloadedmetadata = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error('Camera preview failed'));
        };
      });
      await video.play();
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setScannerStatus('error');
      setErrorMessage('The camera stream did not return a usable video preview.');
      setMessage('Check that another app is not using the selected camera, then restart the scanner.');
      return;
    }

    const Detector = (window as LocalWindow).BarcodeDetector;
    if (!Detector) {
      // BarcodeDetector is not available in many desktop Chrome builds. ZXing
      // decodes the same camera stream as a reliable browser-compatible fallback.
      try {
        const reader = new BrowserQRCodeReader();
        fallbackControlsRef.current = await reader.decodeFromVideoElement(
          video,
          (result) => {
            const rawValue = result?.getText().trim();
            if (rawValue) void processRawValue(rawValue);
          },
        );
        setScannerStatus('ready');
        setMessage('Camera active. Hold a delegate QR inside the frame.');
      } catch {
        setScannerStatus('error');
        setErrorMessage('Unable to start QR decoding. Restart the scanner and try again.');
        setMessage('Camera is ready, but QR decoding could not start.');
      }
      return;
    }

    detectorRef.current = new Detector({ formats: ['qr_code'] });
    setScannerStatus('ready');
    setMessage('Camera active. Hold a delegate QR inside the frame.');

    // ── Scan loop ────────────────────────────────────────────────────────────
    scanTimerRef.current = window.setInterval(async () => {
      if (scanLockRef.current || !videoRef.current || !detectorRef.current) return;

      let rawValue: string | undefined;
      try {
        const results = await detectorRef.current.detect(videoRef.current);
        rawValue = results[0]?.rawValue?.trim();
      } catch {
        setScannerStatus('error');
        setErrorMessage('Unable to decode the QR frame. Try again in better light.');
        setMessage('Scanning error detected.');
        return;
      }

      if (!rawValue) return;

      void processRawValue(rawValue);
    }, 650);
  }, [processRawValue]);

  // Start camera on mount
  useEffect(() => {
    // Small delay so the video element is in the DOM before we query it
    const t = window.setTimeout(() => {
      void startCamera();
    }, 80);
    return () => {
      window.clearTimeout(t);
      if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
      fallbackControlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  useEffect(() => {
    if (scannerStatus === 'success') setErrorMessage('');
  }, [scannerStatus]);

  // ── Restart handler ────────────────────────────────────────────────────────

  const handleRestart = () => {
    setRecord(null);
    setSnapshot(null);
    void startCamera();
  };

  // ── Derived UI state ───────────────────────────────────────────────────────

  const overlayTone =
    scannerStatus === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : scannerStatus === 'error' || scannerStatus === 'unpaid'
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
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <CameraFrame status={scannerStatus} message={message} videoRef={videoRef} />
        </motion.div>

        <div className="space-y-4">
          {/* ── Scanner status card ── */}
          <Card className={cn('overflow-hidden border text-white', overlayTone)}>
            <CardHeader className="border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border',
                    scannerStatus === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : scannerStatus === 'error' || scannerStatus === 'unpaid'
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border-gold-500/30 bg-gold-500/10 text-gold-300',
                  )}
                >
                  {scannerStatus === 'success' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : scannerStatus === 'error' || scannerStatus === 'unpaid' ? (
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
                    Checked In
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
                    Check-in timestamp saved. Scan the next delegate or press Restart Scan.
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

              {scannerStatus === 'unpaid' && snapshot && (
                <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-red-200">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Payment Not Verified
                  </div>
                  <p className="text-lg font-semibold text-white">{snapshot.delegateName}</p>
                  <p className="text-sm text-red-100/80">
                    Ticket <span className="font-mono">{snapshot.ticket}</span> has not completed
                    payment. Deny entry and ask the delegate to complete registration.
                  </p>
                </div>
              )}

              {scannerStatus === 'error' && errorMessage && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
                  <p className="text-sm font-medium">Scan Error</p>
                  <p className="mt-1 text-sm text-red-100/80">{errorMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Last scanned snapshot — empty until a QR is read ── */}
          <Card className="glass-card border-white/[0.08]">
            <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">Last Scanned Delegate</CardTitle>
                  <CardDescription>
                    {snapshot
                      ? 'Details decoded from the most recent QR scan.'
                      : 'Awaiting first scan — no QR captured yet.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {snapshot ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailsCard title="Delegate" value={snapshot.delegateName} icon={UserCheck} />
                  <DetailsCard title="Committee" value={snapshot.committee} icon={Wallet} />
                  <DetailsCard title="Country" value={snapshot.country} icon={Sparkles} />
                  <DetailsCard title="Ticket Number" value={snapshot.ticket} icon={ScanLine} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-muted-foreground">
                  <ScanLine className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No delegate scanned yet.</p>
                  <p className="text-xs">
                    Hold a delegate pass QR in front of the camera to begin.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Controls ── */}
          <Card className="glass-card border-white/[0.08]">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-medium text-foreground">Camera ready for live scans</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan any valid delegate QR to record attendance instantly.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleRestart}>
                <RefreshCcw size={14} />
                Restart Scan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
