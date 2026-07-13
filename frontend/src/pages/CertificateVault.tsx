import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BadgeCheck,
  Download,
  FileImage,
  Gift,
  Medal,
  Share2,
  ShieldCheck,
  Stars,
  Trophy,
  Unlock,
  Users,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/shared/Toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn, formatNumber } from '@/lib/utils';
import {
  formatTimestamp,
  certificatePalette,
  stateConfig,
  buildPreviewMarkup,
  createDefaultCertificates,
} from '@/lib/certificate-utils';
import type { VaultCertificate, CertificateVaultRecord } from '@/lib/certificate-utils';
import { useAuth } from '@/features/auth/AuthContext';
import api from '@/lib/api';
import { jsPDF } from 'jspdf';


const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Unlock,
  BadgeCheck,
  ShieldCheck,
};

const certificateVaultKey = 'mun-gridixia:certificate-vault:v1';

interface VaultStatus {
  applicantName: string | null;
  committeeName: string | null;
  committeeAbbr: string | null;
  paymentVerified: boolean;
  checkedIn: boolean;
  registrationStatus: string;
}

function useVaultStatus() {
  const { user } = useAuth();
  return useQuery<VaultStatus | null>({
    queryKey: ['vault-status', user?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: VaultStatus | null }>('/payments/my-vault-status');
      return data.data;
    },
    enabled: Boolean(user),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

// ── Sub-components ──────────────────────────────────────────

function LoadingVault() {
  return (
    <Card className="glass-card border-white/[0.08]">
      <CardContent className="flex min-h-[440px] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <LoadingSpinner size="lg" />
          <div>
            <p className="text-sm font-medium text-foreground">Loading certificate vault</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Preparing gallery, preview cards, and issuance state.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            {title}
          </CardDescription>
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

function CertificateGallery({
  certificates,
  selectedId,
  onSelect,
}: {
  certificates: VaultCertificate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {certificates.map((certificate) => {
        const config = stateConfig(certificate.state);
        const Icon = iconMap[config.icon] ?? Unlock;
        const isSelected = certificate.id === selectedId;

        return (
          <button
            key={certificate.id}
            type="button"
            onClick={() => onSelect(certificate.id)}
            className={cn(
              'w-full rounded-[22px] border p-4 text-left transition-all duration-200',
              isSelected
                ? 'border-gold-500/30 bg-gold-500/10 shadow-[0_18px_50px_rgba(0,0,0,0.18)]'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border',
                    certificate.state === 'issued'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : certificate.state === 'available'
                        ? 'border-gold-500/20 bg-gold-500/10 text-gold-300'
                        : 'border-white/10 bg-white/[0.03] text-muted-foreground',
                  )}
                >
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
  );
}

function CertificatePreview({
  certificate,
  delegateName,
  committee,
  country,
  canIssue,
  onDownload,
  onDownloadPdf,
  onShare,
  onIssue,
}: {
  certificate: VaultCertificate;
  delegateName: string;
  committee: string;
  country: string;
  canIssue: boolean;
  onDownload: () => void;
  onDownloadPdf: () => void;
  onShare: () => void;
  onIssue: () => void;
}) {
  const verificationBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://gridixia.org';
  const verificationUrl = `${verificationBase}/verify/pending/${certificate.id}`;

  return (
    <div className="min-w-0 bg-[#f5efe2] p-4 text-[#07111f] sm:p-5">
      <div
        className={cn(
          'overflow-hidden rounded-[30px] border p-4 shadow-[0_24px_60px_rgba(7,17,31,0.16)]',
          certificatePalette(certificate.level),
        )}
      >
        <div className="rounded-[26px] border border-white/50 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{certificate.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{certificate.subtitle}</p>
            </div>
            <Badge
              variant={
                certificate.state === 'issued'
                  ? 'active'
                  : certificate.state === 'available'
                    ? 'pending'
                    : 'inactive'
              }
            >
              {stateConfig(certificate.state).label}
            </Badge>
          </div>

          <Separator className="my-5 bg-slate-200" />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="min-w-0 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Delegate</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{delegateName}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {committee} • {country}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewMeta label="Achievement" value={certificate.achievement} />
                <PreviewMeta label="Issued" value={formatTimestamp(certificate.issuedAt)} />
                <PreviewMeta label="Level" value={certificate.level.toUpperCase()} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border',
                      certificate.state === 'issued'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : certificate.state === 'available'
                          ? 'border-amber-200 bg-amber-50 text-amber-600'
                          : 'border-slate-200 bg-slate-50 text-slate-400',
                    )}
                  >
                    {certificate.state === 'locked' ? (
                      <Unlock className="h-4 w-4" />
                    ) : certificate.state === 'available' ? (
                      <BadgeCheck className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {stateConfig(certificate.state).label}
                    </p>
                    <p className="text-sm text-slate-500">
                      {certificate.state === 'locked'
                        ? 'Certificate remains locked until the delegate becomes eligible.'
                        : certificate.state === 'available'
                          ? 'Ready for preview, download, and share.'
                          : 'Issued and archived inside the vault.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Gallery Card
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Professional certificate preview
                  </p>
                </div>
                <FileImage className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200">
                <img
                  src={certificate.previewUrl}
                  alt={certificate.title}
                  className="block h-auto w-full"
                />
              </div>

              {certificate.state !== 'locked' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Button variant="outline" className="w-full justify-start" onClick={onDownload}>
                    <Download size={14} />
                    SVG
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={onDownloadPdf}>
                    <Download size={14} />
                    PDF
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={onShare}>
                    <Share2 size={14} />
                    Share
                  </Button>
                </div>
              )}

              {certificate.state === 'available' && canIssue && (
                <Button className="mt-3 w-full justify-start" onClick={onIssue}>
                  <Gift size={14} />
                  Issue Certificate
                </Button>
              )}
              {certificate.state === 'locked' && (
                <Button className="mt-3 w-full justify-start" variant="outline" asChild>
                  <a href="/check-in">
                    <Unlock size={14} />
                    Unlock Through Check-In
                  </a>
                </Button>
              )}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  <ExternalLink size={11} />
                  Verification URL
                </div>
                <p className="mt-2 break-all font-mono text-[10px] text-slate-600">
                  {verificationUrl}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

function InfoPanel({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
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

// ── Main component ──────────────────────────────────────────

export default function CertificateVault() {
  const { data: vaultStatus, isLoading: statusLoading } = useVaultStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState('participation');
  const [vaultLedger, setVaultLedger] = useState<CertificateVaultRecord>(
    () => {
      if (!user) return {};
      const raw = localStorage.getItem(`${certificateVaultKey}:${user.id}`);
      return raw ? (JSON.parse(raw) as CertificateVaultRecord) : {};
    },
  );

  const delegateName = vaultStatus?.applicantName || user?.email || 'Delegate Pending';
  const committee = vaultStatus?.committeeName || 'Unassigned Committee';
  const country = 'Pending Country';

  const canIssue = Boolean(vaultStatus?.paymentVerified && vaultStatus?.checkedIn);

  // Build a minimal session-like object so createDefaultCertificates can derive states
  const syntheticSession = vaultStatus
    ? {
        status: vaultStatus.paymentVerified ? ('success' as const) : ('pending' as const),
        orderId: user?.id ?? 'pending',
      }
    : undefined;

  const certificates = useMemo(
    () =>
      createDefaultCertificates(
        delegateName,
        committee,
        country,
        syntheticSession as Parameters<typeof createDefaultCertificates>[3],
        vaultLedger,
        vaultStatus?.checkedIn ?? false,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [committee, country, delegateName, vaultStatus, vaultLedger],
  );
  const selectedCertificate =
    certificates.find((certificate) => certificate.id === selectedId) ?? certificates[0];

  if (!selectedCertificate) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate Vault" subtitle="Professional achievement showcase" />
        <Card className="glass-card border-white/[0.08]">
          <CardContent className="flex min-h-[280px] items-center justify-center p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No certificates available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The vault could not build any certificates for the current session.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    setSelectedId((current) =>
      certificates.some((certificate) => certificate.id === current)
        ? current
        : (certificates[0]?.id ?? current),
    );
  }, [certificates]);

  useEffect(() => {
    if (!user) return;
    const nextLedger = (() => {
      const raw = localStorage.getItem(`${certificateVaultKey}:${user.id}`);
      return raw ? (JSON.parse(raw) as CertificateVaultRecord) : {};
    })();
    setVaultLedger(nextLedger);
  }, [user]);

  const isLocked = selectedCertificate.state === 'locked';
  const issuedCount = isLocked ? 0 : 1;
  const availableCount = isLocked ? 0 : 1;
  const lockedCount = isLocked ? 1 : 0;
  const progress = isLocked ? 0 : 100;

  const handleDownload = () => {
    const verificationBase = window.location.origin;
    const verificationUrl = `${verificationBase}/verify/${user?.id ?? 'pending'}/${selectedCertificate.id}`;
    const svg = buildPreviewMarkup(
      selectedCertificate,
      delegateName,
      committee,
      country,
      verificationUrl,
    );
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedCertificate.title.replace(/\s+/g, '-').toLowerCase()}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Certificate downloaded as SVG.', 'success');
  };

  const handleDownloadPdf = async () => {
    const verificationBase = window.location.origin;
    const verificationUrl = `${verificationBase}/verify/${user?.id ?? 'pending'}/${selectedCertificate.id}`;
    const svg = buildPreviewMarkup(
      selectedCertificate,
      delegateName,
      committee,
      country,
      verificationUrl,
    );
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1500;
      canvas.height = 980;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        toast('Failed to render certificate.', 'error');
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1500, 980);
      ctx.drawImage(image, 0, 0, 1500, 980);
      URL.revokeObjectURL(url);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1500, 980],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 1500, 980);
      pdf.save(`${selectedCertificate.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast('Certificate exported as PDF.', 'success');
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast('Failed to render certificate image.', 'error');
    };

    image.src = url;
  };

  const handleShare = async () => {
    const text = selectedCertificate.shareText;
    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedCertificate.title,
          text,
          url: window.location.href,
        });
        toast('Shared successfully.', 'success');
      } else {
        await navigator.clipboard.writeText(text);
        toast('Share text copied to clipboard.', 'success');
      }
    } catch {
      toast('Sharing was cancelled or unavailable.', 'info');
    }
  };

  const handleIssue = () => {
    if (!user) return;
    const nextLedger = { ...vaultLedger };
    const key = `certificate:${user.id}:${selectedCertificate.id}`;
    nextLedger[key] = {
      state: 'issued',
      issuedAt: new Date().toISOString(),
      sharedAt: nextLedger[key]?.sharedAt,
    };
    setVaultLedger(nextLedger);
    localStorage.setItem(`${certificateVaultKey}:${user.id}`, JSON.stringify(nextLedger));
    toast(`${selectedCertificate.title} issued successfully.`, 'success');
  };

  if (statusLoading) {
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
        <StatCard
          title="Certificates Issued"
          value={formatNumber(issuedCount)}
          subtitle="Unlocked recognition"
          icon={Award}
        />
        <StatCard
          title="Available"
          value={formatNumber(availableCount)}
          subtitle="Ready to claim"
          icon={BadgeCheck}
        />
        <StatCard
          title="Locked"
          value={formatNumber(lockedCount)}
          subtitle="Awaiting eligibility"
          icon={Unlock}
        />
        <StatCard
          title="Vault Completion"
          value={`${Math.round(progress)}%`}
          subtitle="Gallery progress"
          icon={ShieldCheck}
        />
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden border-white/[0.08] bg-[#08111d] text-white shadow-2xl shadow-black/35">
          <CardHeader className="border-b border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardDescription className="text-[10px] uppercase tracking-[0.34em] text-white/50">
                  Certificate Gallery
                </CardDescription>
                <CardTitle className="mt-2 text-2xl text-white">Achievement Showcase</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-white/65">
                  Browse the delegate&apos;s recognition set with premium conference styling.
                </p>
              </div>
              <div className="rounded-2xl border border-gold-500/20 bg-gold-500/10 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-300">
                  Current State
                </p>
                <p className="mt-1 text-xl font-semibold text-gold-200">
                  {selectedCertificate.state.toUpperCase()}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-0 p-0 max-lg:grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="min-w-0 border-b border-white/10 bg-white/[0.02] p-4 lg:border-b-0 lg:border-r lg:border-white/10">
              <CertificateGallery
                certificates={certificates}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            <CertificatePreview
              certificate={selectedCertificate}
              delegateName={delegateName}
              committee={committee}
              country={country}
              canIssue={canIssue}
              onDownload={handleDownload}
              onDownloadPdf={handleDownloadPdf}
              onShare={handleShare}
              onIssue={handleIssue}
            />
          </CardContent>
        </Card>

        <Card className="glass-card min-w-0 border-white/[0.08]">
          <CardHeader className="space-y-3 border-b border-white/[0.06] bg-white/[0.015]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/10 text-gold-400">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Achievement Cards</CardTitle>
                <CardDescription>
                  Professional recognition highlights and medal-style progress.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-2">
            <AchievementCard
              title="Delegate Readiness"
              description="Registration and payment status"
              score={vaultStatus?.paymentVerified ? 'Payment Verified' : 'Waiting for payment'}
              icon={ShieldCheck}
            />
            <AchievementCard
              title="Conference Presence"
              description="Check-in and attendance validation"
              score={vaultStatus?.checkedIn ? 'Attended and verified' : 'Pending check-in'}
              icon={Users}
            />
            <AchievementCard
              title="Diplomatic Excellence"
              description="Committee participation status"
              score={committee}
              icon={Medal}
            />
            <AchievementCard
              title="Recognition Path"
              description="Unlocked achievement pipeline"
              score={
                selectedCertificate.state === 'issued'
                  ? 'Issued certificate archived'
                  : 'Claimable after eligibility'
              }
              icon={Stars}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoPanel
            title="Locked"
            value={formatNumber(lockedCount)}
            description="Certificates waiting on eligibility"
            icon={Unlock}
          />
          <InfoPanel
            title="Available"
            value={formatNumber(availableCount)}
            description="Ready for download or share"
            icon={BadgeCheck}
          />
          <InfoPanel
            title="Issued"
            value={formatNumber(issuedCount)}
            description="Archived in the certificate vault"
            icon={ShieldCheck}
          />
        </div>
      </div>
    </div>
  );
}
