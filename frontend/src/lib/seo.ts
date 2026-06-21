import { useEffect } from 'react';

interface SeoMeta {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

const SITE_NAME = 'MUN Gridixia';
const DEFAULT_IMAGE = '/og-image.png';
const SITE_URL = 'https://gridixia.org';

export function useSeo(meta: SeoMeta): void {
  useEffect(() => {
    const fullTitle = meta.title === SITE_NAME ? meta.title : `${meta.title} | ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta('description', meta.description);

    setMeta('og:title', fullTitle);
    setMeta('og:description', meta.description);
    setMeta('og:image', meta.image ?? DEFAULT_IMAGE);
    setMeta('og:url', meta.url ?? SITE_URL);
    setMeta('og:type', meta.type ?? 'website');
    setMeta('og:site_name', SITE_NAME);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', meta.description);
    setMeta('twitter:image', meta.image ?? DEFAULT_IMAGE);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', meta.url ?? SITE_URL);
    }
  }, [meta.title, meta.description, meta.image, meta.url, meta.type]);
}

function setMeta(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
  }
  if (el) {
    el.setAttribute('content', content);
  }
}

export const PAGE_SEO = {
  home: {
    title: SITE_NAME,
    description: 'Conference Operations Command Center. Manage registrations, payments, committees, and delegate workflows in real-time.',
  },
  dashboard: {
    title: 'Dashboard',
    description: 'Your delegate dashboard. Track registration, payment, committee allocation, attendance, and certification status.',
  },
  commandCenter: {
    title: 'Command Center',
    description: 'Real-time metrics, visualizations, and operations monitoring for conference administrators.',
  },
  events: {
    title: 'Events',
    description: 'Browse and manage MUN and Youth Parliament conferences.',
  },
  committees: {
    title: 'Committees',
    description: 'View committee details, topics, capacities, and delegate allocations.',
  },
  delegates: {
    title: 'Delegates',
    description: 'Manage delegate registrations, profiles, and country assignments.',
  },
  payments: {
    title: 'Payments',
    description: 'Secure payment processing for conference fees and registrations.',
  },
  checkIn: {
    title: 'Check-In Scanner',
    description: 'Scan delegate passes for event check-in and attendance tracking.',
  },
  certificateVault: {
    title: 'Certificate Vault',
    description: 'Access and download your conference achievement certificates.',
  },
  settings: {
    title: 'Settings',
    description: 'Manage your account settings and preferences.',
  },
  monitoring: {
    title: 'Monitoring',
    description: 'System health, error tracking, and Sentry integration status.',
  },
  login: {
    title: 'Sign In',
    description: 'Sign in to your MUN Gridixia account.',
  },
} as const;
