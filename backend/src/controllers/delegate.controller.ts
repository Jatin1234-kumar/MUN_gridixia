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
    const userId = new Types.ObjectId((req as AuthenticatedRequest).user.sub);

    const fields = { status: 1, paymentStatus: 1, committeeId: 1, eventId: 1, registrationNumber: 1, submittedAt: 1 };
    // A delegate may have a newer unfinished application after an earlier paid
    // registration. The pass must bind to the paid registration, not blindly to
    // the newest draft.
    const registration = await RegistrationModel.findOne(
      { userId, deletedAt: null, paymentStatus: 'paid' },
      fields,
    ).sort({ updatedAt: -1 }).lean()
      ?? await RegistrationModel.findOne({ userId, deletedAt: null }, fields).sort({ updatedAt: -1 }).lean();

    if (!registration) throw new AppError(404, 'No registration found');

    const [existingTicket, committee, payment] = await Promise.all([
      TicketModel.findOne(
        { registrationId: registration._id, deletedAt: null },
        { ticketNumber: 1, status: 1, qrToken: 1 },
      ).lean(),
      registration.committeeId
        ? CommitteeModel.findById(registration.committeeId, { name: 1, abbr: 1 }).lean()
        : null,
      PaymentModel.findOne(
        { registrationId: registration._id, deletedAt: null },
        { metadata: 1 },
      ).sort({ createdAt: -1 }).lean(),
    ]);

    const assignedCountry = getPersistedCountry(payment?.metadata);

    // Repair passes issued before ticket creation was wired into payment capture.
    // This is idempotent and only runs for an already paid registration.
    const ticket = registration.paymentStatus === 'paid' && !existingTicket
      ? await TicketModel.findOneAndUpdate(
          { registrationId: registration._id, deletedAt: null },
          {
            $setOnInsert: {
              registrationId: registration._id,
              userId,
              eventId: registration.eventId,
              ticketNumber: `DP-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`.toUpperCase(),
              qrToken: randomBytes(24).toString('hex'),
              qrCode: 'pending-qr-generation',
              status: 'issued',
              issuedAt: new Date(),
            },
          },
          { new: true, upsert: true, projection: { ticketNumber: 1, status: 1, qrToken: 1 } },
        ).lean()
      : existingTicket;

    // This endpoint backs the pass and must never be served from a browser/proxy cache.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    res.json({
      data: {
        ticketNumber: ticket?.ticketNumber ?? null,
        registrationNumber: registration.registrationNumber,
        registrationStatus: registration.status,
        paymentStatus: registration.paymentStatus,
        assignedCommittee: committee?.name ?? null,
        committeeAbbr: committee?.abbr ?? null,
        assignedCountry,
        submittedAt: registration.submittedAt,
        qrToken: ticket?.qrToken ?? null,
        ticketStatus: ticket?.status ?? null,
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

  const country = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return country?.trim() ?? null;
}
