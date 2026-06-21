export type EmailTemplateName =
  | 'registration-success'
  | 'payment-success'
  | 'committee-allocation'
  | 'ticket-issued'
  | 'certificate-issued';

export interface EmailRecipient {
  email: string;
  name: string;
}

interface BaseTemplateData {
  recipientName: string;
  eventName: string;
  dashboardUrl: string;
}

export interface RegistrationSuccessEmailData extends BaseTemplateData {
  committeeName?: string;
  committeeAbbr?: string;
  registrationId: string;
}

export interface PaymentSuccessEmailData extends BaseTemplateData {
  amount: number;
  receiptId: string;
  committeeName?: string;
  paymentMethod: string;
}

export interface CommitteeAllocationEmailData extends BaseTemplateData {
  committeeName: string;
  committeeAbbr: string;
  country: string;
  agenda: string;
}

export interface TicketIssuedEmailData extends BaseTemplateData {
  ticketNumber: string;
  checkInUrl: string;
  delegatePassUrl: string;
}

export interface CertificateIssuedEmailData extends BaseTemplateData {
  certificateName: string;
  issuedAt: string;
  certificateUrl: string;
}

export type EmailPayloadMap = {
  'registration-success': RegistrationSuccessEmailData;
  'payment-success': PaymentSuccessEmailData;
  'committee-allocation': CommitteeAllocationEmailData;
  'ticket-issued': TicketIssuedEmailData;
  'certificate-issued': CertificateIssuedEmailData;
};

export interface QueuedEmail<T extends EmailTemplateName = EmailTemplateName> {
  template: T;
  to: EmailRecipient;
  data: EmailPayloadMap[T];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}