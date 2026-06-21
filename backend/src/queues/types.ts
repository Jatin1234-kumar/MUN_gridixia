// ── QR Generation ────────────────────────────────────────────────────────────

export interface GenerateQrJobData {
  ticketId: string;
  ticketNumber: string;
  userId: string;
  eventId: string;
}

export interface GenerateQrJobResult {
  ticketId: string;
  qrDataUrl: string;
}

// ── Certificate Generation ────────────────────────────────────────────────────

export interface GenerateCertificateJobData {
  certificateId: string;
  userId: string;
  eventId: string;
  registrationId: string;
  recipientName: string;
  eventName: string;
  certificateName: string;
  issuedAt: string;
}

export interface GenerateCertificateJobResult {
  certificateId: string;
  fileUrl: string;
}

// ── Email ─────────────────────────────────────────────────────────────────────
// Re-exported from the email service – the queue type lives there.
export type { QueuedEmail } from '../services/email/types';
