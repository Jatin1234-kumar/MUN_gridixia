import { lazy } from 'react';

type LazyFactory = () => Promise<{ default: React.ComponentType }>;

interface PreloadableRoute {
  component: React.LazyExoticComponent<React.ComponentType>;
  preload: () => void;
}

function createPreloadable(factory: LazyFactory): PreloadableRoute {
  const Component = lazy(factory);
  let promise: Promise<{ default: React.ComponentType }> | null = null;

  return {
    component: Component,
    preload: () => {
      if (!promise) {
        promise = factory();
      }
      return promise.then(() => {});
    },
  };
}

export const routes = {
  login: createPreloadable(() => import('@/pages/Login')),
  dashboard: createPreloadable(() => import('@/pages/Dashboard')),
  commandCenter: createPreloadable(() => import('@/pages/CommandCenter')),
  events: createPreloadable(() => import('@/pages/Events')),
  committees: createPreloadable(() => import('@/pages/Committees')),
  delegates: createPreloadable(() => import('@/pages/Delegates')),
  countryAllocation: createPreloadable(() => import('@/pages/CountryAllocation')),
  delegatePass: createPreloadable(() => import('@/pages/DelegatePass')),
  checkInScanner: createPreloadable(() => import('@/pages/CheckInScanner')),
  certificateVault: createPreloadable(() => import('@/pages/CertificateVault')),
  payments: createPreloadable(() => import('@/pages/Payments')),
  reports: createPreloadable(() => import('@/pages/Reports')),
  settings: createPreloadable(() => import('@/pages/Settings')),
  monitoring: createPreloadable(() => import('@/pages/Monitoring')),
  notFound: createPreloadable(() => import('@/pages/NotFound')),
} as const;

export function preloadRoute(name: keyof typeof routes): void {
  routes[name].preload();
}

export function preloadCriticalRoutes(): void {
  const nav = navigator;
  if (!nav.connection || (nav.connection as { effectiveType?: string }).effectiveType !== '2g') {
    routes.dashboard.preload();
    routes.events.preload();
    routes.committees.preload();
  }
}
