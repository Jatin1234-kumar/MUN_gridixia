interface MetricEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

const metrics: MetricEntry[] = [];

function categorize(name: string, value: number): MetricEntry['rating'] {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
    INP: [200, 500],
  };

  const [good, poor] = thresholds[name] ?? [0, 0];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function observePerformance(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      record('LCP', last.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* observer not supported */ }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      let cls = 0;
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!e.hadRecentInput && e.value) cls += e.value;
      }
      record('CLS', cls);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* observer not supported */ }

  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          record('FCP', entry.startTime);
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch { /* observer not supported */ }

  try {
    const ttfbObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { responseStart?: number };
        if (e.responseStart) {
          record('TTFB', e.responseStart);
        }
      }
    });
    ttfbObserver.observe({ type: 'navigation', buffered: true });
  } catch { /* observer not supported */ }
}

function record(name: string, value: number): void {
  metrics.push({
    name,
    value,
    rating: categorize(name, value),
    timestamp: Date.now(),
  });
}

export function getMetrics(): MetricEntry[] {
  return [...metrics];
}

export function reportMetrics(endpoint?: string): void {
  const data = {
    url: window.location.href,
    userAgent: navigator.userAgent,
    metrics: getMetrics(),
  };

  if (endpoint) {
    navigator.sendBeacon(endpoint, JSON.stringify(data));
  } else if (import.meta.env.DEV) {
    console.table(data.metrics);
  }
}
