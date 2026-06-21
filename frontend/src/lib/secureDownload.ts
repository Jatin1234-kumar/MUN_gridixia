import api from '@/lib/api';

export interface DownloadOptions {
  filename?: string;
  onProgress?: (percent: number) => void;
}

export async function secureDownload(
  url: string,
  options: DownloadOptions = {},
): Promise<void> {
  const response = await api.get(url, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

  const blob = response.data as Blob;
  const contentDisposition = response.headers['content-disposition'];
  const filename = options.filename ?? extractFilename(contentDisposition) ?? 'download';

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = sanitizeFilename(filename);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}

export async function secureDownloadWithProgress(
  url: string,
  options: DownloadOptions = {},
): Promise<void> {
  const response = await api.get(url, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
    onDownloadProgress: (progressEvent) => {
      if (options.onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        options.onProgress(percent);
      }
    },
  });

  const blob = response.data as Blob;
  const contentDisposition = response.headers['content-disposition'];
  const filename = options.filename ?? extractFilename(contentDisposition) ?? 'download';

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = sanitizeFilename(filename);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}

function extractFilename(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/filename\*?=(?:UTF-8''|"?)([^";\n]+)/i);
  if (match) {
    return decodeURIComponent(match[1].replace(/"/g, ''));
  }
  return null;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(0, 255);
}
