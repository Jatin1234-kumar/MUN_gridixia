import { enqueueEmail } from './queue';
import type {
  CertificateIssuedEmailData,
  CommitteeAllocationEmailData,
  PaymentSuccessEmailData,
  QueuedEmail,
  RegistrationSuccessEmailData,
  TicketIssuedEmailData,
} from './types';

export const emailService = {
  queue<T extends QueuedEmail>(job: T) {
    return enqueueEmail(job);
  },

  registrationSuccess(to: { email: string; name: string }, data: RegistrationSuccessEmailData) {
    return enqueueEmail({
      template: 'registration-success',
      to,
      data,
    } as QueuedEmail<'registration-success'>);
  },

  paymentSuccess(to: { email: string; name: string }, data: PaymentSuccessEmailData) {
    return enqueueEmail({ template: 'payment-success', to, data });
  },

  committeeAllocation(to: { email: string; name: string }, data: CommitteeAllocationEmailData) {
    return enqueueEmail({ template: 'committee-allocation', to, data });
  },

  ticketIssued(to: { email: string; name: string }, data: TicketIssuedEmailData) {
    return enqueueEmail({ template: 'ticket-issued', to, data });
  },

  certificateIssued(to: { email: string; name: string }, data: CertificateIssuedEmailData) {
    return enqueueEmail({ template: 'certificate-issued', to, data });
  },
};