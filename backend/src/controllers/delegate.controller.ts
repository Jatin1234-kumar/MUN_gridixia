import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { delegateService } from '../services/delegate.service';
import { asyncHandler } from '../utils/asyncHandler';
import { RegistrationModel } from '../models/Registration';
import { TicketModel } from '../models/Ticket';
import { CommitteeModel } from '../models/Committee';
import { PaymentModel } from '../models/Payment';
import { AppError } from '../utils/AppError';
import type { AuthenticatedRequest } from '../middleware/authenticate';
import type { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';

export const delegateController = {
  getMyPass: asyncHandler(async (req, res) => {
    const rawSub = (req as AuthenticatedRequest).user?.sub;
    if (!rawSub || !Types.ObjectId.isValid(rawSub)) {
      throw new AppError(401, 'Invalid or missing user identity in token');
    }
    const userId = new Types.ObjectId(rawSub);

    const fields = {
      status: 1,
      paymentStatus: 1,
      committeeId: 1,
      eventId: 1,
      registrationNumber: 1,
      submittedAt: 1,
    };
    // Prefer the most-recently-updated paid registration; fall back to any
    // active registration so a delegate mid-application still sees their pass.
    const registration =
      (await RegistrationModel.findOne({ userId, paymentStatus: 'paid' }, fields)
        .sort({ updatedAt: -1 })
        .lean()) ??
      (await RegistrationModel.findOne({ userId }, fields).sort({ updatedAt: -1 }).lean());

    if (!registration) throw new AppError(404, 'No registration found');

    const [existingTicket, committee, payment] = await Promise.all([
      TicketModel.findOne(
        { registrationId: registration._id },
        { ticketNumber: 1, status: 1, qrToken: 1, qrCode: 1 },
      ).lean(),
      registration.committeeId
        ? CommitteeModel.findById(registration.committeeId, { name: 1, abbr: 1 }).lean()
        : Promise.resolve(null),
      PaymentModel.findOne({ registrationId: registration._id }, { metadata: 1 })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const assignedCountry = getPersistedCountry(payment?.metadata);

    // Repair passes issued before ticket creation was wired into payment capture.
    // Uses findOneAndUpdate+upsert so concurrent requests are safe against the
    // unique index on registrationId — a duplicate-key race just re-reads the
    // winner instead of throwing a 500.
    let ticket = existingTicket;
    if (registration.paymentStatus === 'paid' && !existingTicket) {
      try {
        ticket = await TicketModel.findOneAndUpdate(
          { registrationId: registration._id },
          {
            $setOnInsert: {
              registrationId: registration._id,
              userId,
              eventId: registration.eventId,
              ticketNumber:
                `DP-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`.toUpperCase(),
              qrToken: randomBytes(24).toString('hex'),
              qrCode: 'pending-qr-generation',
              status: 'issued',
              issuedAt: new Date(),
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
            },
          },
          {
            new: true,
            upsert: true,
            projection: { ticketNumber: 1, status: 1, qrToken: 1, qrCode: 1 },
          },
        ).lean();
      } catch (upsertErr: unknown) {
        // A duplicate-key error means a concurrent request already created the
        // ticket — read it back rather than surfacing a 500.
        const isDupe =
          upsertErr &&
          typeof upsertErr === 'object' &&
          'code' in upsertErr &&
          (upsertErr as { code: number }).code === 11000;
        if (isDupe) {
          ticket = await TicketModel.findOne(
            { registrationId: registration._id },
            { ticketNumber: 1, status: 1, qrToken: 1, qrCode: 1 },
          ).lean();
        } else {
          console.error('[getMyPass] ticket upsert failed:', upsertErr);
          // Non-duplicate failure: still return the pass without a ticket number
          // rather than crashing — the repair can be retried on the next request.
          ticket = null;
        }
      }
    }

    const isPaid = registration.paymentStatus === 'paid';
    // Only expose the QR code after backend-verified payment.
    // The raw qrToken never leaves the server.
    const qrCode =
      isPaid && ticket?.qrCode && ticket.qrCode !== 'pending-qr-generation' ? ticket.qrCode : null;

    // Must never be served from a browser/proxy cache.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    res.json({
      data: {
        ticketNumber: isPaid ? (ticket?.ticketNumber ?? null) : null,
        registrationNumber: registration.registrationNumber,
        registrationStatus: registration.status,
        paymentStatus: registration.paymentStatus,
        assignedCommittee: isPaid ? (committee?.name ?? null) : null,
        committeeAbbr: isPaid ? (committee?.abbr ?? null) : null,
        assignedCountry: isPaid ? assignedCountry : null,
        submittedAt: (registration.submittedAt as Date).toISOString(),
        qrCode,
        ticketStatus: isPaid ? (ticket?.status ?? null) : null,
      },
    });
  }),

  getAll: asyncHandler(async (_req, res) => {
    res.json({ data: await delegateService.getAll() });
  }),

  getById: asyncHandler(async (req, res) => {
    res.json({ data: await delegateService.getById(req.params.id) });
  }),

  create: asyncHandler(async (req: Request<object, object, CreateDelegateDto>, res: Response) => {
    res.status(201).json({ data: await delegateService.create(req.body) });
  }),

  update: asyncHandler(
    async (req: Request<{ id: string }, object, UpdateDelegateDto>, res: Response) => {
      res.json({ data: await delegateService.update(req.params.id, req.body) });
    },
  ),

  delete: asyncHandler(async (req, res) => {
    await delegateService.delete(req.params.id);
    res.status(204).send();
  }),
};

function getPersistedCountry(metadata: Record<string, unknown> | undefined): string | null {
  const draft = metadata?.applicationDraft as Record<string, unknown> | null | undefined;
  const countryPreference = draft?.countryPreference as Record<string, unknown> | null | undefined;
  const candidates = [
    metadata?.assignedCountry,
    metadata?.country,
    draft?.assignedCountry,
    draft?.country,
    countryPreference?.assignedCountry,
    countryPreference?.firstChoiceCountry,
  ];

  const country = candidates.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  return country?.trim() ?? null;
}
