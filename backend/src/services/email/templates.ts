import type {
  CertificateIssuedEmailData,
  CommitteeAllocationEmailData,
  EmailPayloadMap,
  EmailTemplateName,
  PaymentSuccessEmailData,
  RegistrationSuccessEmailData,
  RenderedEmail,
  TicketIssuedEmailData,
} from './types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function renderDetailList(details: Array<{ label: string; value: string }>) {
  return details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;color:#8090a4;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#0b1220;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');
}

function renderTextBlock(lines: string[]) {
  return lines.filter(Boolean).join('\n');
}

function createShell(options: {
  title: string;
  heading: string;
  intro: string;
  details: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  ctaUrl?: string;
  accent: string;
  footerNote: string;
}) {
  const detailsMarkup = renderDetailList(options.details);
  const ctaMarkup = options.ctaLabel && options.ctaUrl
    ? `
      <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;margin-top:28px;background:${options.accent};color:#07111f;text-decoration:none;font-weight:700;border-radius:14px;padding:14px 22px;">${escapeHtml(options.ctaLabel)}</a>
    `
    : '';

  return {
    html: `
      <div style="margin:0;padding:0;background:#07111f;font-family:Inter,Arial,sans-serif;color:#0b1220;">
        <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
          <div style="border-radius:28px;overflow:hidden;background:#ffffff;border:1px solid rgba(212,175,55,0.18);box-shadow:0 24px 70px rgba(0,0,0,0.32);">
            <div style="padding:28px 28px 20px;background:linear-gradient(135deg,#07111f 0%,#10233b 100%);color:#f8f4ea;border-bottom:4px solid ${options.accent};">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#d4af37;">MUN Gridixia</p>
              <h1 style="margin:0;font-size:28px;line-height:1.1;">${escapeHtml(options.heading)}</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:rgba(248,244,234,0.82);">${escapeHtml(options.intro)}</p>
            </div>
            <div style="padding:28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                ${detailsMarkup}
              </table>
              ${ctaMarkup}
              <p style="margin:28px 0 0;font-size:13px;line-height:1.7;color:#5c6b80;">${escapeHtml(options.footerNote)}</p>
            </div>
          </div>
        </div>
      </div>
    `,
    text: renderTextBlock([
      options.heading,
      options.intro,
      '',
      ...options.details.map((detail) => `${detail.label}: ${detail.value}`),
      options.ctaLabel && options.ctaUrl ? `${options.ctaLabel}: ${options.ctaUrl}` : '',
      '',
      options.footerNote,
    ]),
  } satisfies Pick<RenderedEmail, 'html' | 'text'>;
}

export function renderEmailTemplate<T extends EmailTemplateName>(template: T, data: EmailPayloadMap[T]): RenderedEmail {
  switch (template) {
    case 'registration-success':
      return renderRegistrationSuccessEmail(data as RegistrationSuccessEmailData);
    case 'payment-success':
      return renderPaymentSuccessEmail(data as PaymentSuccessEmailData);
    case 'committee-allocation':
      return renderCommitteeAllocationEmail(data as CommitteeAllocationEmailData);
    case 'ticket-issued':
      return renderTicketIssuedEmail(data as TicketIssuedEmailData);
    case 'certificate-issued':
      return renderCertificateIssuedEmail(data as CertificateIssuedEmailData);
    default:
      throw new Error(`Unsupported email template: ${String(template)}`);
  }
}

export function renderRegistrationSuccessEmail(data: RegistrationSuccessEmailData): RenderedEmail {
  return {
    subject: `Registration confirmed for ${data.eventName}`,
    ...createShell({
      title: 'Registration Success',
      heading: `Welcome, ${data.recipientName}`,
      intro: `Your delegate registration for ${data.eventName} has been confirmed. Your application is now in the conference pipeline and will appear in the delegate workspace.`,
      details: [
        { label: 'Event', value: data.eventName },
        { label: 'Registration ID', value: data.registrationId },
        { label: 'Committee Preference', value: data.committeeName ? `${data.committeeAbbr ?? ''} ${data.committeeName}`.trim() : 'Pending review' },
      ],
      ctaLabel: 'Open Dashboard',
      ctaUrl: data.dashboardUrl,
      accent: '#d4af37',
      footerNote: 'Keep this email for your records. The delegate dashboard will reflect your next milestone automatically.',
    }),
  };
}

export function renderPaymentSuccessEmail(data: PaymentSuccessEmailData): RenderedEmail {
  return {
    subject: `Payment received for ${data.eventName}`,
    ...createShell({
      title: 'Payment Success',
      heading: `Payment confirmed for ${data.recipientName}`,
      intro: `Your payment for ${data.eventName} has been processed successfully. The conference record is now updated and your delegate pass can be issued.`,
      details: [
        { label: 'Amount', value: formatCurrency(data.amount) },
        { label: 'Receipt ID', value: data.receiptId },
        { label: 'Committee', value: data.committeeName ?? 'Pending allocation' },
        { label: 'Method', value: data.paymentMethod },
      ],
      ctaLabel: 'View Delegate Pass',
      ctaUrl: data.dashboardUrl,
      accent: '#88c19f',
      footerNote: 'If you need to review the payment journey, return to the payment workspace for your session details.',
    }),
  };
}

export function renderCommitteeAllocationEmail(data: CommitteeAllocationEmailData): RenderedEmail {
  return {
    subject: `Committee allocation for ${data.eventName}`,
    ...createShell({
      title: 'Committee Allocation',
      heading: `Your committee assignment is ready`,
      intro: `The secretariat has assigned your committee for ${data.eventName}. Review your portfolio details before the next committee briefing.`,
      details: [
        { label: 'Committee', value: `${data.committeeAbbr} ${data.committeeName}`.trim() },
        { label: 'Country', value: data.country },
        { label: 'Agenda', value: data.agenda },
        { label: 'Dashboard', value: data.dashboardUrl },
      ],
      ctaLabel: 'Review Allocation',
      ctaUrl: data.dashboardUrl,
      accent: '#4f8ccf',
      footerNote: 'Please review your agenda and country portfolio before the first session begins.',
    }),
  };
}

export function renderTicketIssuedEmail(data: TicketIssuedEmailData): RenderedEmail {
  return {
    subject: `Your delegate ticket is ready`,
    ...createShell({
      title: 'Ticket Issued',
      heading: `Your conference pass is ready`,
      intro: `Your delegate ticket is now available. Use the pass link to display your boarding-pass style entry card at check-in.`,
      details: [
        { label: 'Ticket Number', value: data.ticketNumber },
        { label: 'Delegate Pass', value: data.delegatePassUrl },
        { label: 'Check-In', value: data.checkInUrl },
      ],
      ctaLabel: 'Open Delegate Pass',
      ctaUrl: data.delegatePassUrl,
      accent: '#d4af37',
      footerNote: 'Bring your pass to the venue or open it on mobile for a faster check-in experience.',
    }),
  };
}

export function renderCertificateIssuedEmail(data: CertificateIssuedEmailData): RenderedEmail {
  return {
    subject: `Certificate issued: ${data.certificateName}`,
    ...createShell({
      title: 'Certificate Issued',
      heading: `Recognition has been archived`,
      intro: `Your ${data.certificateName} is now available in the certificate vault. Download or share it to preserve your achievement record.`,
      details: [
        { label: 'Certificate', value: data.certificateName },
        { label: 'Issued At', value: data.issuedAt },
        { label: 'Certificate Link', value: data.certificateUrl },
      ],
      ctaLabel: 'Open Vault',
      ctaUrl: data.certificateUrl,
      accent: '#c7a76b',
      footerNote: 'This certificate is part of your official delegate achievement record.',
    }),
  };
}