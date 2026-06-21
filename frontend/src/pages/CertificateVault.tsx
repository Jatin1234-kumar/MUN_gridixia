import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  Download,
  Eye,
  FileImage,
  Gift,
  Medal,
  Share2,
  ShieldCheck,
  Sparkles,
  Stars,
  Trophy,
  Unlock,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import type { DelegateApplicationDraft, PaymentSession } from '@/types';

const delegateDraftKey = 'mun-gridixia:delegate-application-draft:v1';
const paymentSessionKey = 'mun-gridixia:payment-session:v1';
const checkInLedgerKey = 'mun-gridixia:checkin-ledger:v1';
const certificateVaultKey = 'mun-gridixia:certificate-vault:v1';

type CertificateState = 'locked' | 'available' | 'issued';

type VaultCertificate = {
  id: string;
  title: string;
  subtitle: string;
  state: CertificateState;
  issuedAt?: string;
  previewUrl: string;
  shareText: string;
  achievement: string;
  level: 'bronze' | 'silver' | 'gold';
};

type CertificateVaultRecord = Record<string, { state: CertificateState; issuedAt?: string; sharedAt?: string }>;

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
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function useVaultContext() {
  const [draft, setDraft] = useState<Partial<DelegateApplicationDraft> | undefined>(undefined);
  const [session, setSession] = useState<PaymentSession | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(readJson<DelegateApplicationDraft>(delegateDraftKey));
    setSession(readJson<PaymentSession>(paymentSessionKey));
    setReady(true);
  }, []);

  return { draft, session, ready };
}

function formatTimestamp(value?: string) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function certificatePalette(level: VaultCertificate['level']) {
  return {
    bronze: 'from-amber-700/20 to-amber-500/5 border-amber-500/20 text-amber-200',
    silver: 'from-slate-300/20 to-slate-100/5 border-slate-200/20 text-slate-100',
    gold: 'from-gold-500/20 to-gold-500/5 border-gold-500/30 text-gold-100',
  }[level];
}

function stateConfig(state: CertificateState) {
  return {
    locked: { label: 'Locked', badge: 'inactive' as const, icon: Unlock, accent: 'text-muted-foreground' },
    available: { label: 'Available', badge: 'pending' as const, icon: BadgeCheck, accent: 'text-gold-300' },
    issued: { label: 'Issued', badge: 'active' as const, icon: ShieldCheck, accent: 'text-emerald-300' },
  }[state];
}

function buildPreviewMarkup(certificate: VaultCertificate, delegateName: string, committee: string, country: string) {
  const issuedAt = certificate.issuedAt || new Date().toISOString();
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="980" viewBox="0 0 1500 980">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#06101d" />
          <stop offset="55%" stop-color="#0c1828" />
          <stop offset="100%" stop-color="#11233b" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f5db93" />
          <stop offset="100%" stop-color="#c08a16" />
        </linearGradient>
      </defs>
      <rect width="1500" height="980" rx="44" fill="url(#bg)" />
      <rect x="54" y="54" width="1392" height="872" rx="36" fill="#f5efe2" opacity="0.98" />
      <rect x="82" y="82" width="1336" height="816" rx="30" fill="#ffffff" />
      <rect x="82" y="82" width="1336" height="144" rx="30" fill="#07111f" />
      <rect x="82" y="194" width="1336" height="10" fill="url(#gold)" />
      <text x="124" y="132" fill="#f8f4ea" font-family="Inter, Arial, sans-serif" font-size="28" letter-spacing="6">CERTIFICATE VAULT</text>
      <text x="124" y="170" fill="#d4af37" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">PROFESSIONAL ACHIEVEMENT SHOWCASE</text>
      <text x="124" y="298" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">AWARDED TO</text>
      <text x="124" y="352" fill="#07111f" font-family="Georgia, serif" font-size="58" font-weight="700">${delegateName}</text>
      <text x="124" y="430" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">CERTIFICATE</text>
      <text x="124" y="476" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">${certificate.title}</text>
      <text x="124" y="544" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">DETAILS</text>
      <text x="124" y="586" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">${committee} • ${country}</text>
      <text x="124" y="664" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">ISSUED</text>
      <text x="124" y="700" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">${formatTimestamp(issuedAt)}</text>
      <rect x="896" y="276" width="418" height="418" rx="34" fill="#faf7f0" stroke="#eadfc4" stroke-width="2" />
      <rect x="932" y="312" width="346" height="346" rx="24" fill="#ffffff" stroke="#d4af37" stroke-width="2" />
      <text x="1105" y="482" fill="#d4af37" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700">${certificate.level.toUpperCase()}</text>
      <text x="1105" y="520" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">ACHIEVEMENT LEVEL</text>
      <text x="1105" y="726" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">${certificate.achievement}</text>
      <rect x="896" y="736" width="418" height="80" rx="20" fill="#f4ead1" />
      <text x="938" y="782" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">MUN GRIDIXIA • CERTIFIED RECORD</text>
    </svg>`;
}

function buildDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createDefaultCertificates(delegateName: string, committee: string, country: string, session?: PaymentSession, ledger?: CertificateVaultRecord): VaultCertificate[] {
  const canIssue = Boolean(session?.status === 'success' && ledger);
  const hasAttendance = Boolean(readJson<Record<string, unknown>>(checkInLedgerKey)?.[session ? `DP-${session.orderId.slice(-8).toUpperCase()}` : '']);
  const lookupState = (id: string): CertificateState | undefined => {
    if (!session) return undefined;
    return ledger?.[`certificate:${session.orderId}:${id}`]?.state;
  };

  const issuedAtFor = (id: string) => (session ? ledger?.[`certificate:${session.orderId}:${id}`]?.issuedAt : undefined);
  const base: Array<Omit<VaultCertificate, 'previewUrl' | 'shareText'>> = [
    {
      id: 'participation',
      title: 'Participation Certificate',
      subtitle: 'Conference attendance and delegate registration',
      state: lookupState('participation') ?? (canIssue && hasAttendance ? 'available' : 'locked'),
      issuedAt: issuedAtFor('participation'),
      achievement: 'Delegate Recognition',
      level: 'bronze',
    },
    {
      id: 'diplomacy',
      title: 'Diplomatic Excellence',
      subtitle: 'Committee performance and strategic engagement',
      state: lookupState('diplomacy') ?? (canIssue ? 'available' : 'locked'),
      issuedAt: issuedAtFor('diplomacy'),
      achievement: 'Excellence Medal',
      level: 'silver',
    },
    {
      id: 'distinction',
      title: 'Distinguished Delegate',
      subtitle: 'Top-tier conference recognition and achievement',
      state: lookupState('distinction') ?? (canIssue && hasAttendance ? 'issued' : canIssue ? 'available' : 'locked'),
      issuedAt: issuedAtFor('distinction'),
      achievement: 'Honor Award',
      level: 'gold',
    },
  ];

  return base.map((certificate) => {
    const previewUrl = buildDataUrl(buildPreviewMarkup({ ...certificate, previewUrl: '', shareText: '' } as VaultCertificate, delegateName, committee, country));
    return {
      ...certificate,
      previewUrl,
      shareText: `${certificate.title} for ${delegateName} • ${committee} • ${country}`,
    };
  });
}

function AchievementCard({
  title,
  description,
  score,
  icon: Icon,
}: {
  title: string;
  description: string;
  score: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Achievement</p>
          <p className="mt-2 text-sm text-foreground">{score}</p>
        </div>
        <Stars className="h-5 w-5 text-gold-400" />
      </CardContent>
    </Card>
  );
}

function LoadingVault() {
  return (
    <Card className="glass-card border-white/[0.08]">
      <CardContent className="flex min-h-[440px] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <LoadingSpinner size="lg" />
          <div>
            <p className="text-sm font-medium text-foreground">Loading certificate vault</p>
            <p className="mt-1 text-sm text-muted-foreground">Preparing gallery, preview cards, and issuance state.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CertificateVault() {
  const { draft, session, ready } = useVaultContext();
  const [selectedId, setSelectedId] = useState('participation');
  const [vaultLedger, setVaultLedger] = useState<CertificateVaultRecord>(() => readJson<CertificateVaultRecord>(certificateVaultKey) ?? {});
  const [shareMessage, setShareMessage] = useState('');

  const delegateName = session?.applicantName || draft?.personal.fullName || 'Delegate Pending';
  const committee = session?.committeeName || draft?.committeePreference.preferredCommitteeName || 'Unassigned Committee';
  const country = draft?.countryPreference.firstChoiceCountry || 'Pending Country';

  const checkInTicket = session ? `DP-${session.orderId.slice(-8).toUpperCase()}` : undefined;
  const checkInRecord = checkInTicket ? readJson<Record<string, { checkedInAt: string }>>(checkInLedgerKey)?.[checkInTicket] : undefined;
  const canIssue = Boolean(session?.status === 'success' && checkInRecord);

  const certificates = useMemo(() => createDefaultCertificates(delegateName, committee, country, session, vaultLedger), [committee, country, delegateName, session, vaultLedger]);
  const selectedCertificate = certificates.find((certificate) => certificate.id === selectedId) ?? certificates[0];

  useEffect(() => {
    setSelectedId((current) => (certificates.some((certificate) => certificate.id === current) ? current : certificates[0]?.id ?? current));
  }, [certificates]);

  useEffect(() => {
    const nextLedger = readJson<CertificateVaultRecord>(certificateVaultKey) ?? {};
    setVaultLedger(nextLedger);
  }, []);

  const issuedCount = certificates.filter((certificate) => certificate.state === 'issued').length;
  const availableCount = certificates.filter((certificate) => certificate.state === 'available').length;
  const lockedCount = certificates.filter((certificate) => certificate.state === 'locked').length;
  const progress = (issuedCount / certificates.length) * 100;

  const updateCertificateState = (id: string, nextState: CertificateState) => {
    const nextLedger = { ...vaultLedger };
    const key = `certificate:${session?.orderId ?? 'pending'}:${id}`;
    nextLedger[key] = {
      state: nextState,
      issuedAt: nextState === 'issued' ? new Date().toISOString() : nextLedger[key]?.issuedAt,
      sharedAt: nextLedger[key]?.sharedAt,
    };
    setVaultLedger(nextLedger);
    writeJson(certificateVaultKey, nextLedger);
  };

  const handleDownload = async () => {
    const svg = buildPreviewMarkup(selectedCertificate, delegateName, committee, country);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedCertificate.title.replace(/\s+/g, '-').toLowerCase()}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = `${selectedCertificate.title} • ${delegateName} • ${committee} • ${country}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedCertificate.title,
          text,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setShareMessage('Share text copied to clipboard.');
      }
    } catch {
      setShareMessage('Sharing was cancelled or unavailable.');
    }
  };

  const handleIssue = () => {
    if (!session) return;
    const nextLedger = { ...vaultLedger };
    const key = `certificate:${session.orderId}:${selectedCertificate.id}`;
    nextLedger[key] = { state: 'issued', issuedAt: new Date().toISOString(), sharedAt: nextLedger[key]?.sharedAt };
    setVaultLedger(nextLedger);
    writeJson(certificateVaultKey, nextLedger);
    setShareMessage(`${selectedCertificate.title} issued successfully.`);
  };

  if (!ready) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate Vault" subtitle="Professional achievement showcase" />
        <LoadingVault />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Certificate Vault"
        subtitle="Certificate gallery with preview, download, and share actions"
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href="/check-in">Open Scanner</a>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Certificates Issued" value={formatNumber(issuedCount)} subtitle="Unlocked recognition" icon={Award} />
        <StatCard title="Available" value={formatNumber(availableCount)} subtitle="Ready to claim" icon={BadgeCheck} />
        <StatCard title="Locked" value={formatNumber(lockedCount)} subtitle="Awaiting eligibility" icon={Unlock} />
        <StatCard title="Vault Completion" value={`${Math.round(progress)}%`} subtitle="Gallery progress" icon={ShieldCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden border-white/[0.08] bg-[#08111d] text-white shadow-2xl shadow-black/35">
          <CardHeader className="border-b border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardDescription className="text-[10px] uppercase tracking-[0.34em] text-white/50">Certificate Gallery</CardDescription>
                <CardTitle className="mt-2 text-2xl text-white">Achievement Showcase</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-white/65">Browse the delegate&apos;s recognition set with premium conference styling inspired by award walls and ceremonial certificates.</p>
              </div>
              <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-300">Current State</p>
                <p className="mt-1 text-xl font-semibold text-gold-200">{selectedCertificate.state.toUpperCase()}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-0 p-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-white/10 bg-white/[0.02] p-4 lg:border-b-0 lg:border-r lg:border-white/10">
              <div className="space-y-3">
                {certificates.map((certificate) => {
                  const config = stateConfig(certificate.state);
                  const Icon = config.icon;
                  const isSelected = certificate.id === selectedId;

                  return (
                    <button
                      key={certificate.id}
                      type="button"
                      onClick={() => setSelectedId(certificate.id)}
                      className={cn(
                        'w-full rounded-[22px] border p-4 text-left transition-all duration-200',
                        isSelected ? 'border-gold-500/30 bg-gold-500/10 shadow-[0_18px_50px_rgba(0,0,0,0.18)]' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', certificate.state === 'issued' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : certificate.state === 'available' ? 'border-gold-500/20 bg-gold-500/10 text-gold-300' : 'border-white/10 bg-white/[0.03] text-muted-foreground')}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{certificate.title}</p>
                            <p className="mt-1 text-xs text-white/60">{certificate.subtitle}</p>
                          </div>
                        </div>
                        <Badge variant={config.badge}>{config.label}</Badge>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-white/55">
                        <span>{certificate.achievement}</span>
                        <span className="font-mono uppercase tracking-[0.2em]">{certificate.level}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#f5efe2] p-4 text-[#07111f] sm:p-5">
              <div className={cn('overflow-hidden rounded-[30px] border p-4 shadow-[0_24px_60px_rgba(7,17,31,0.16)]', certificatePalette(selectedCertificate.level))}>
                <div className="rounded-[26px] border border-white/50 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Preview</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedCertificate.title}</h2>
                      <p className="mt-2 text-sm text-slate-500">{selectedCertificate.subtitle}</p>
                    </div>
                    <Badge variant={selectedCertificate.state === 'issued' ? 'active' : selectedCertificate.state === 'available' ? 'pending' : 'inactive'}>{stateConfig(selectedCertificate.state).label}</Badge>
                  </div>

                  <Separator className="my-5 bg-slate-200" />

                  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Delegate</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">{delegateName}</p>
                        <p className="mt-2 text-sm text-slate-500">{committee} • {country}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <PreviewMeta label="Achievement" value={selectedCertificate.achievement} />
                        <PreviewMeta label="Issued" value={formatTimestamp(selectedCertificate.issuedAt)} />
                        <PreviewMeta label="Level" value={selectedCertificate.level.toUpperCase()} />
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border', selectedCertificate.state === 'issued' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : selectedCertificate.state === 'available' ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                            <IconGlyph state={selectedCertificate.state} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{stateConfig(selectedCertificate.state).label}</p>
                            <p className="text-sm text-slate-500">{selectedCertificate.state === 'locked' ? 'Certificate remains locked until the delegate becomes eligible.' : selectedCertificate.state === 'available' ? 'Ready for preview, download, and share.' : 'Issued and archived inside the vault.'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-inner">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Gallery Card</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">Professional certificate preview</p>
                        </div>
                        <FileImage className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200">
                        <img src={selectedCertificate.previewUrl} alt={selectedCertificate.title} className="block h-auto w-full" />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Button variant="outline" className="w-full justify-start" onClick={handleDownload}>
                          <Download size={14} />
                          Download
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={handleShare}>
                          <Share2 size={14} />
                          Share
                        </Button>
                      </div>

                      {selectedCertificate.state === 'available' && canIssue && (
                        <Button className="mt-3 w-full justify-start" onClick={handleIssue}>
                          <Gift size={14} />
                          Issue Certificate
                        </Button>
                      )}
                      {selectedCertificate.state === 'locked' && (
                        <Button className="mt-3 w-full justify-start" variant="outline" asChild>
                          <a href="/check-in">
                            <Unlock size={14} />
                            Unlock Through Check-In
                          </a>
                        </Button>
                      )}

                      {shareMessage && <p className="mt-3 text-sm text-slate-600">{shareMessage}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/[0.08]">
          <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Achievement Cards</CardTitle>
                <CardDescription>Professional recognition highlights and medal-style progress.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <AchievementCard title="Delegate Readiness" description="Registration and payment status" score={session?.status === 'success' ? 'Conference ready' : 'Waiting for payment'} icon={ShieldCheck} />
            <AchievementCard title="Conference Presence" description="Check-in and attendance validation" score={checkInRecord ? 'Attended and verified' : 'Pending check-in'} icon={Users} />
            <AchievementCard title="Diplomatic Excellence" description="Committee participation status" score={committee} icon={Medal} />
            <AchievementCard title="Recognition Path" description="Unlocked achievement pipeline" score={selectedCertificate.state === 'issued' ? 'Issued certificate archived' : 'Claimable after eligibility'} icon={Stars} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoPanel title="Locked" value={formatNumber(lockedCount)} description="Certificates waiting on eligibility" icon={Unlock} />
          <InfoPanel title="Available" value={formatNumber(availableCount)} description="Ready for download or share" icon={BadgeCheck} />
          <InfoPanel title="Issued" value={formatNumber(issuedCount)} description="Archived in the certificate vault" icon={ShieldCheck} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }: { title: string; value: string; subtitle: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl text-foreground">{value}</CardTitle>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function InfoPanel({ title, value, description, icon: Icon }: { title: string; value: string; description: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="glass-card border-white/[0.08]">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function IconGlyph({ state }: { state: CertificateState }) {
  return state === 'locked' ? <Unlock className="h-4 w-4" /> : state === 'available' ? <BadgeCheck className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />;
}