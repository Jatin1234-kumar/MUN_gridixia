import { readJson } from '@/lib/storage';
import type { PaymentSession } from '@/types';

const checkInLedgerKey = 'mun-gridixia:checkin-ledger:v1';

export type CertificateState = 'locked' | 'available' | 'issued';

export type VaultCertificate = {
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

export type CertificateVaultRecord = Record<
  string,
  { state: CertificateState; issuedAt?: string; sharedAt?: string }
>;

export function formatTimestamp(value?: string) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function certificatePalette(level: VaultCertificate['level']) {
  return {
    bronze: 'from-amber-700/20 to-amber-500/5 border-amber-500/20 text-amber-200',
    silver: 'from-slate-300/20 to-slate-100/5 border-slate-200/20 text-slate-100',
    gold: 'from-gold-500/20 to-gold-500/5 border-gold-500/30 text-gold-100',
  }[level];
}

export function stateConfig(state: CertificateState) {
  return {
    locked: {
      label: 'Locked',
      badge: 'inactive' as const,
      icon: 'Unlock',
      accent: 'text-muted-foreground',
    },
    available: {
      label: 'Available',
      badge: 'pending' as const,
      icon: 'BadgeCheck',
      accent: 'text-gold-300',
    },
    issued: {
      label: 'Issued',
      badge: 'active' as const,
      icon: 'ShieldCheck',
      accent: 'text-emerald-300',
    },
  }[state];
}

export function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPreviewMarkup(
  certificate: VaultCertificate,
  delegateName: string,
  committee: string,
  country: string,
  verificationUrl: string,
) {
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
      <text x="124" y="352" fill="#07111f" font-family="Georgia, serif" font-size="58" font-weight="700">${escapeXml(delegateName)}</text>
      <text x="124" y="430" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">CERTIFICATE</text>
      <text x="124" y="476" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">${escapeXml(certificate.title)}</text>
      <text x="124" y="544" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3">DETAILS</text>
      <text x="124" y="586" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">${escapeXml(committee)} • ${escapeXml(country)}</text>
      <text x="124" y="664" fill="#6b7280" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">ISSUED</text>
      <text x="124" y="700" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">${escapeXml(formatTimestamp(issuedAt))}</text>
      <rect x="896" y="276" width="418" height="418" rx="34" fill="#faf7f0" stroke="#eadfc4" stroke-width="2" />
      <rect x="932" y="312" width="346" height="346" rx="24" fill="#ffffff" stroke="#d4af37" stroke-width="2" />
      <text x="1105" y="482" fill="#d4af37" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700">${escapeXml(certificate.level.toUpperCase())}</text>
      <text x="1105" y="520" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">ACHIEVEMENT LEVEL</text>
      <text x="1105" y="620" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" letter-spacing="1">VERIFY AT</text>
      <text x="1105" y="644" fill="#07111f" text-anchor="middle" font-family="monospace" font-size="11">${escapeXml(verificationUrl)}</text>
      <text x="1105" y="726" fill="#6b7280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">${escapeXml(certificate.achievement)}</text>
      <rect x="896" y="736" width="418" height="80" rx="20" fill="#f4ead1" />
      <text x="938" y="782" fill="#07111f" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">MUN GRIDIXIA • CERTIFIED RECORD</text>
    </svg>`;
}

export function buildDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createDefaultCertificates(
  delegateName: string,
  committee: string,
  country: string,
  session?: PaymentSession,
  ledger?: CertificateVaultRecord,
): VaultCertificate[] {
  const canIssue = Boolean(session?.status === 'success' && ledger);
  const hasAttendance = Boolean(
    readJson<Record<string, unknown>>(checkInLedgerKey)?.[
      session ? `DP-${session.orderId.slice(-8).toUpperCase()}` : ''
    ],
  );
  const lookupState = (id: string): CertificateState | undefined => {
    if (!session) return undefined;
    return ledger?.[`certificate:${session.orderId}:${id}`]?.state;
  };
  const issuedAtFor = (id: string) =>
    session ? ledger?.[`certificate:${session.orderId}:${id}`]?.issuedAt : undefined;

  const verificationBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://gridixia.org';

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
      state:
        lookupState('distinction') ??
        (canIssue && hasAttendance ? 'issued' : canIssue ? 'available' : 'locked'),
      issuedAt: issuedAtFor('distinction'),
      achievement: 'Honor Award',
      level: 'gold',
    },
  ];

  return base.map((certificate) => {
    const verificationUrl = `${verificationBase}/verify/${session?.orderId ?? 'pending'}/${certificate.id}`;
    const previewUrl = buildDataUrl(
      buildPreviewMarkup(
        { ...certificate, previewUrl: '', shareText: '' } as VaultCertificate,
        delegateName,
        committee,
        country,
        verificationUrl,
      ),
    );
    return {
      ...certificate,
      previewUrl,
      shareText: `${certificate.title} for ${delegateName} • ${committee} • ${country} • Verify: ${verificationUrl}`,
    };
  });
}
