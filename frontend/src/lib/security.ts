const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

export function sanitizeInput(value: string): string {
  return value.replace(/[&<>"'`/]/g, (char) => ENTITY_MAP[char] ?? char);
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    const val = sanitized[key];
    if (typeof val === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeInput(val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      (sanitized as Record<string, unknown>)[key] = val.map((item) =>
        typeof item === 'string' ? sanitizeInput(item) : item,
      );
    }
  }
  return sanitized;
}

export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const CSRF_TOKEN_KEY = 'mun-gridixia:csrf-token';

export function getCsrfToken(): string | null {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.getAttribute('content');

  const cookieMatch = document.cookie.match(/XSRF-Token=([^;]+)/);
  if (cookieMatch) return decodeURIComponent(cookieMatch[1]);

  return sessionStorage.getItem(CSRF_TOKEN_KEY);
}

export function setCsrfToken(token: string): void {
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
}

export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}
