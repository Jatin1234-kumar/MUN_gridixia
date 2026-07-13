import { connectMongo, disconnectMongo } from '../config/mongoose';
import { UserModel } from '../models/User';
import { RegistrationModel } from '../models/Registration';
import { PaymentModel } from '../models/Payment';
import { TicketModel } from '../models/Ticket';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run diagnose:pass -- user@example.com');

  await connectMongo();
  const user = await UserModel.findOne({ email, deletedAt: null })
    .select('email role status refreshTokenVersion')
    .lean();

  if (!user) {
    console.log(`No active user found for ${email}`);
    return;
  }

  const registrations = await RegistrationModel.find({ userId: user._id, deletedAt: null })
    .select('registrationNumber eventId committeeId status paymentStatus submittedAt updatedAt')
    .sort({ updatedAt: -1 })
    .lean();
  const registrationIds = registrations.map((registration) => registration._id);
  const [tickets, payments] = await Promise.all([
    TicketModel.find({ registrationId: { $in: registrationIds }, deletedAt: null })
      .select('registrationId ticketNumber status qrToken issuedAt')
      .lean(),
    PaymentModel.find({ registrationId: { $in: registrationIds }, deletedAt: null })
      .select('registrationId status orderId receipt metadata.applicationDraft metadata.country metadata.assignedCountry paidAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  console.dir({
    user: { id: String(user._id), email: user.email, role: user.role, status: user.status },
    registrations: registrations.map((registration) => ({
      id: String(registration._id),
      registrationNumber: registration.registrationNumber,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      committeeId: registration.committeeId ? String(registration.committeeId) : null,
      eventId: String(registration.eventId),
    })),
    tickets: tickets.map((ticket) => ({
      registrationId: String(ticket.registrationId),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      hasQrToken: Boolean(ticket.qrToken),
    })),
    payments: payments.map((payment) => ({
      registrationId: String(payment.registrationId),
      status: payment.status,
      orderId: payment.orderId,
      receipt: payment.receipt,
      country: getPersistedCountry(payment.metadata),
    })),
  }, { depth: null });
}

function getPersistedCountry(metadata: Record<string, unknown> | undefined): string | null {
  const draft = metadata?.applicationDraft as Record<string, unknown> | null | undefined;
  const preferences = draft?.countryPreference as Record<string, unknown> | null | undefined;
  const country = [
    metadata?.assignedCountry,
    metadata?.country,
    draft?.assignedCountry,
    draft?.country,
    preferences?.assignedCountry,
    preferences?.firstChoiceCountry,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return country?.trim() ?? null;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
