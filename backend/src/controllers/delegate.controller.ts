import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { delegateService } from '../services/delegate.service';
import { asyncHandler } from '../utils/asyncHandler';
import { RegistrationModel } from '../models/Registration';
import { TicketModel } from '../models/Ticket';
import { CommitteeModel } from '../models/Committee';
import { PaymentModel } from '../models/Payment';
import { UserModel } from '../models/User';
import { AttendanceModel } from '../models/Attendance';
import { dispatchQrJob } from '../queues';
import { AppError } from '../utils/AppError';
import type { AuthenticatedRequest } from '../middleware/authenticate';
import type { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';

const PENDING_QR_PREFIX = 'pending-qr-generation:';
const LEGACY_PENDING_QR_CODE = 'pending-qr-generation';

function isPendingQrCode(qrCode: string): boolean {
  return qrCode === LEGACY_PENDING_QR_CODE || qrCode.startsWith(PENDING_QR_PREFIX);
}

export const delegateController = {
  checkIn: asyncHandler(async (req, res) => {
    const body = req.body as { qrToken?: unknown };
    const qrToken = typeof body.qrToken === 'string' ? body.qrToken.trim() : '';
    if (!/^[a-f0-9]{48}$/i.test(qrToken)) {
      throw new AppError(400, 'Invalid delegate pass QR code');
    }

    const ticket = await TicketModel.findOne({ qrToken, deletedAt: null }).lean().exec();
    if (!ticket) throw new AppError(404, 'Delegate pass was not found');

    const [registration, delegate, payment] = await Promise.all([
      RegistrationModel.findById(ticket.registrationId).lean().exec(),
      UserModel.findById(ticket.userId, { firstName: 1, lastName: 1 }).lean().exec(),
      PaymentModel.findOne({ registrationId: ticket.registrationId }, { metadata: 1 })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);
    if (!registration || registration.paymentStatus !== 'paid') {
      throw new AppError(409, 'This delegate pass has not completed payment');
    }

    const checkedInAt = new Date();
    const checkedInTicket = await TicketModel.findOneAndUpdate(
      { _id: ticket._id, checkedInAt: null, status: { $in: ['issued', 'active'] } },
      { $set: { status: 'used', checkedInAt } },
      { new: true },
    )
      .lean()
      .exec();

    if (!checkedInTicket && !ticket.checkedInAt && ticket.status !== 'used') {
      throw new AppError(409, 'This delegate pass is not valid for check-in');
    }

    const alreadyCheckedIn = !checkedInTicket;
    const effectiveTicket = checkedInTicket ?? ticket;
    if (!alreadyCheckedIn) {
      await Promise.all([
        RegistrationModel.updateOne(
          { _id: registration._id, status: 'confirmed' },
          { $set: { status: 'checked_in', checkedInAt } },
        ).exec(),
        AttendanceModel.findOneAndUpdate(
          { registrationId: registration._id, deletedAt: null },
          {
            $set: {
              status: 'present',
              markedAt: checkedInAt,
              markedBy: new Types.ObjectId((req as AuthenticatedRequest).user.sub),
              isDeleted: false,
              deletedAt: null,
            },
            $setOnInsert: {
              registrationId: registration._id,
              userId: registration.userId,
              eventId: registration.eventId,
              committeeId: registration.committeeId ?? null,
            },
          },
          { upsert: true, new: true },
        ).exec(),
      ]);
    }

    const committee = registration.committeeId
      ? await CommitteeModel.findById(registration.committeeId, { name: 1, abbr: 1 }).lean().exec()
      : null;

    res.json({
      data: {
        status: alreadyCheckedIn ? 'already_checked_in' : 'checked_in',
        ticketNumber: effectiveTicket.ticketNumber,
        checkedInAt: (effectiveTicket.checkedInAt ?? checkedInAt).toISOString(),
        delegateName: [delegate?.firstName, delegate?.lastName].filter(Boolean).join(' ') || 'Delegate',
        committee: committee?.name ?? 'Unassigned',
        country: getPersistedCountry(payment?.metadata) ?? 'Not assigned',
      },
    });
  }),

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
              // Keep the placeholder unique because production databases may
              // have a unique index on qrCode.
              qrCode: `${PENDING_QR_PREFIX}${randomBytes(24).toString('hex')}`,
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

    // This endpoint can repair a paid registration from before ticket creation
    // was wired into payment capture. Queue its QR work too; otherwise the pass
    // remains in "being prepared" forever. The fixed job id makes polling safe.
    if (ticket && isPendingQrCode(ticket.qrCode) && ticket.ticketNumber && ticket.qrToken) {
      await dispatchQrJob({
        ticketId: String(ticket._id),
        ticketNumber: ticket.ticketNumber,
        qrToken: ticket.qrToken,
        userId: String(userId),
        eventId: String(registration.eventId),
      });
    }

    const isPaid = registration.paymentStatus === 'paid';
    // Only expose the QR code after backend-verified payment.
    // The raw qrToken never leaves the server.
    const qrCode =
      isPaid && ticket?.qrCode && !isPendingQrCode(ticket.qrCode) ? ticket.qrCode : null;

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
