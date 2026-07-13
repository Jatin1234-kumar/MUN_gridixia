import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { AuditLogModel } from '../../models/AuditLog';
import { dispatchQrJob } from '../../queues';
import { config } from '../../config';
import { AttendanceModel } from '../../models/Attendance';
import { CommitteeModel } from '../../models/Committee';
import { EventModel } from '../../models/Event';
import { PaymentModel, type PaymentDocument } from '../../models/Payment';
import { TicketModel } from '../../models/Ticket';
import { RegistrationModel, type RegistrationDocument } from '../../models/Registration';
import { AppError } from '../../utils/AppError';
import {
  createRazorpayOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from './razorpay.client';
import type { FeeBreakdown, RazorpayPaymentEntity } from './payment.types';

const OPEN_PAYMENT_STATUSES = ['created', 'pending', 'authorized'] as const;

export interface CreatePaymentOrderInput {
  userId: string;
  userRole?: string;
  committeeId: string;
  applicantName: string;
  email: string;
  paymentMethod: 'card' | 'upi' | 'netbanking';
  billingName: string;
  couponCode?: string;
  applicationDraft?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifyPaymentInput {
  userId: string;
  userRole?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  ipAddress?: string;
  userAgent?: string;
}

export const paymentService = {
  async createOrder(input: CreatePaymentOrderInput) {
    if (!Types.ObjectId.isValid(input.userId)) throw new AppError(400, 'Invalid user ID');
    if (!Types.ObjectId.isValid(input.committeeId)) {
      throw new AppError(400, 'Invalid committee ID');
    }

    const committee = await CommitteeModel.findById(input.committeeId).lean().exec();
    if (!committee) throw new AppError(404, 'Committee not found');

    const event = await EventModel.findById(committee.eventId).lean().exec();
    if (!event) throw new AppError(404, 'Linked event not found');

    const userId = new Types.ObjectId(input.userId);
    const eventId = new Types.ObjectId(event._id);
    const committeeId = new Types.ObjectId(committee._id);
    const registration = await findOrCreateRegistration({ userId, eventId, committeeId });

    const existingPayment = await PaymentModel.findOne({
      userId,
      eventId,
      registrationId: registration._id,
      status: { $in: OPEN_PAYMENT_STATUSES },
      orderId: { $ne: null },
    }).exec();

    if (existingPayment?.orderId) {
      return toOrderResponse(existingPayment, {
        keyId: config.razorpay.keyId,
        committee,
        event,
        registration,
      });
    }

    const fees = computeFees(committee, event, input.couponCode ?? '');
    console.log('[payment] event.baseFee:', event.baseFee, '| computed fees:', fees);
    const receipt = generateReceipt();
    const order = await createRazorpayOrder({
      amount: toPaise(fees.total),
      currency: 'INR',
      receipt,
      notes: {
        registrationId: registration.id,
        userId: input.userId,
        eventId: String(event._id),
        committeeId: String(committee._id),
      },
    });

    const payment = await PaymentModel.create({
      registrationId: registration._id,
      userId,
      eventId,
      provider: 'razorpay',
      status: 'created',
      amount: fees.total,
      currency: 'INR',
      receipt,
      orderId: order.id,
      attemptNumber: 1,
      metadata: {
        applicantName: input.applicantName,
        billingName: input.billingName,
        email: input.email,
        preferredMethod: input.paymentMethod,
        feeBreakdown: fees,
        razorpayOrderStatus: order.status,
        applicationDraft: input.applicationDraft ?? null,
      },
    });

    await RegistrationModel.findByIdAndUpdate(registration._id, {
      $set: { paymentStatus: 'pending', committeeId },
    }).exec();

    await AuditLogModel.create({
      actorId: userId,
      actorRole: input.userRole,
      entityType: 'Payment',
      entityId: payment.id,
      action: 'create',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { orderId: order.id, amount: fees.total },
    });

    return toOrderResponse(payment, {
      keyId: config.razorpay.keyId,
      committee,
      event,
      registration,
    });
  },

  async verify(input: VerifyPaymentInput) {
    if (
      !verifyCheckoutSignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      })
    ) {
      await markPaymentFailed(input.razorpayOrderId, 'Invalid Razorpay signature');
      throw new AppError(400, 'Invalid payment signature');
    }

    const payment = await PaymentModel.findOne({ orderId: input.razorpayOrderId }).exec();
    if (!payment) throw new AppError(404, 'Payment order not found');
    if (String(payment.userId) !== input.userId)
      throw new AppError(403, 'Payment does not belong to this user');

    // Fetch the registration before capture so we have committeeId available
    const registration = await RegistrationModel.findById(payment.registrationId).exec();

    const updated = await capturePayment(payment, {
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      source: 'checkout_verify',
      webhookEventId: undefined,
    });

    // Increment the committee fill rate now that payment is confirmed
    if (registration?.committeeId) {
      await CommitteeModel.findOneAndUpdate(
        {
          _id: registration.committeeId,
          $expr: { $lt: ['$filledSeats', '$capacity'] },
        },
        { $inc: { filledSeats: 1 } },
      ).exec();
    }

    await AuditLogModel.create({
      actorId: new Types.ObjectId(input.userId),
      actorRole: input.userRole,
      entityType: 'Payment',
      entityId: updated.id,
      action: 'pay',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        source: 'checkout_verify',
      },
    });

    return toPaymentResponse(updated);
  },

  async getByOrderId(orderId: string, userId: string) {
    const payment = await PaymentModel.findOne({ orderId }).exec();
    if (!payment) throw new AppError(404, 'Payment order not found');
    if (String(payment.userId) !== userId)
      throw new AppError(403, 'Payment does not belong to this user');
    return toPaymentResponse(payment);
  },

  async getAllForAdmin(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      PaymentModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email')
        .populate('eventId', 'name')
        .lean()
        .exec(),
      PaymentModel.countDocuments(),
    ]);

    return {
      rows: rows.map((p) => ({
        id: String(p._id),
        orderId: p.orderId ?? '—',
        receiptId: p.receipt,
        amount: p.amount,
        currency: p.currency,
        status: mapPaymentStatus(p.status),
        applicantName: (p.metadata?.applicantName as string | undefined) ?? '—',
        email: (p.metadata?.email as string | undefined) ?? '—',
        eventName: (p.eventId as unknown as { name?: string } | null)?.name ?? '—',
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  },

  async getPaidEventIds(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const registrations = await RegistrationModel.find(
      { userId: new Types.ObjectId(userId), paymentStatus: 'paid' },
      { eventId: 1 },
    )
      .lean()
      .exec();
    return registrations.map((r) => String(r.eventId));
  },

  async getMyRegistrationStatus(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    // Return the most recently updated registration for this user
    const registration = await RegistrationModel.findOne(
      { userId: new Types.ObjectId(userId) },
      { status: 1, paymentStatus: 1, committeeId: 1, eventId: 1, registrationNumber: 1 },
    )
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    if (!registration) return null;
    return {
      registrationNumber: registration.registrationNumber,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      committeeId: registration.committeeId ? String(registration.committeeId) : null,
      eventId: String(registration.eventId),
      isConfirmed: registration.status === 'confirmed' && registration.paymentStatus === 'paid',
    };
  },

  async getMyVaultStatus(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;

    const uid = new Types.ObjectId(userId);

    const registration = await RegistrationModel.findOne({ userId: uid })
      .sort({ updatedAt: -1 })
      .populate<{ committeeId: { name: string; abbr: string } | null }>('committeeId', 'name abbr')
      .lean()
      .exec();

    if (!registration) return null;

    const payment = await PaymentModel.findOne({ userId: uid, status: 'captured' })
      .sort({ paidAt: -1 })
      .lean()
      .exec();

    const attendance = await AttendanceModel.findOne({ userId: uid })
      .sort({ markedAt: -1 })
      .lean()
      .exec();

    const committee = registration.committeeId as { name: string; abbr: string } | null;

    return {
      applicantName: (payment?.metadata?.applicantName as string | undefined) ?? null,
      billingName: (payment?.metadata?.billingName as string | undefined) ?? null,
      applicantEmail: (payment?.metadata?.email as string | undefined) ?? null,
      committeeName: committee?.name ?? null,
      committeeAbbr: committee?.abbr ?? null,
      committeeId: registration.committeeId ? String(registration.committeeId) : null,
      applicationDraft:
        (payment?.metadata?.applicationDraft as Record<string, unknown> | undefined) ?? null,
      paymentVerified: registration.paymentStatus === 'paid',
      checkedIn: attendance?.status === 'present',
      registrationStatus: registration.status,
    };
  },

  async handleWebhook(rawBody: Buffer, signature: string | undefined, eventId?: string) {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      throw new AppError(400, 'Invalid Razorpay webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: { payment?: { entity?: RazorpayPaymentEntity } };
    };

    const entity = payload.payload?.payment?.entity;
    if (!entity?.order_id) return { received: true, ignored: true };

    if (payload.event === 'payment.captured' || entity.status === 'captured') {
      const payment = await PaymentModel.findOne({ orderId: entity.order_id }).exec();
      if (payment) {
        const wasAlreadyCaptured = payment.status === 'captured';
        await capturePayment(payment, {
          paymentId: entity.id,
          signature: undefined,
          source: 'webhook',
          webhookEventId: eventId,
          gatewayPayment: entity,
        });
        // Only increment once — skip if the payment was already captured before this webhook
        if (!wasAlreadyCaptured) {
          const registration = await RegistrationModel.findById(payment.registrationId).exec();
          if (registration?.committeeId) {
            await CommitteeModel.findOneAndUpdate(
              {
                _id: registration.committeeId,
                $expr: { $lt: ['$filledSeats', '$capacity'] },
              },
              { $inc: { filledSeats: 1 } },
            ).exec();
          }
        }
      }
    } else if (payload.event === 'payment.failed' || entity.status === 'failed') {
      await markPaymentFailed(
        entity.order_id,
        entity.error_description ?? 'Payment failed at gateway',
        eventId,
        entity,
      );
    }

    return { received: true };
  },
};

function computeFees(
  committee: { type: string; capacity: number },
  event: { type: string; baseFee?: number },
  couponCode = '',
): FeeBreakdown {
  const baseFee = event.baseFee ?? (event.type === 'YOUTH_PARLIAMENT' ? 2800 : 3500);
  const committeeFee =
    (committee.type === 'MUN' ? 1700 : 1300) + Math.round(committee.capacity * 10);
  const kitFee = 250;
  const serviceFee = 300;
  const subtotal = baseFee + committeeFee + kitFee + serviceFee;
  const discount =
    couponCode.trim().toUpperCase() === 'GRIDIXIA10' ? Math.round(subtotal * 0.1) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.18);

  return {
    baseFee,
    committeeFee,
    kitFee,
    serviceFee,
    discount,
    tax,
    total: taxable + tax,
  };
}

async function findOrCreateRegistration(input: {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  committeeId: Types.ObjectId;
}): Promise<RegistrationDocument> {
  const existing = await RegistrationModel.findOne({
    userId: input.userId,
    eventId: input.eventId,
  }).exec();

  if (existing) return existing;

  try {
    return await RegistrationModel.create({
      registrationNumber: generateRegistrationNumber(),
      userId: input.userId,
      eventId: input.eventId,
      committeeId: input.committeeId,
      status: 'pending',
      paymentStatus: 'pending',
    });
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      const retryExisting = await RegistrationModel.findOne({
        userId: input.userId,
        eventId: input.eventId,
      }).exec();
      if (retryExisting) return retryExisting;
    }
    throw err;
  }
}

async function capturePayment(
  payment: PaymentDocument,
  input: {
    paymentId: string;
    signature?: string;
    source: 'checkout_verify' | 'webhook';
    webhookEventId?: string;
    gatewayPayment?: RazorpayPaymentEntity;
  },
): Promise<PaymentDocument> {
  if (payment.status === 'captured') return payment;

  payment.status = 'captured';
  payment.paymentId = input.paymentId;
  payment.signature = input.signature ?? payment.signature;
  payment.paidAt = payment.paidAt ?? new Date();
  payment.failureReason = null;
  payment.metadata = {
    ...(payment.metadata ?? {}),
    gatewayPayment: input.gatewayPayment ?? (payment.metadata ?? {}).gatewayPayment,
    lastVerifiedBy: input.source,
    webhookEventIds: mergeWebhookEventId(payment.metadata?.webhookEventIds, input.webhookEventId),
  };

  await payment.save();

  await RegistrationModel.findByIdAndUpdate(payment.registrationId, {
    $set: { paymentStatus: 'paid', status: 'confirmed' },
  }).exec();

  await ensureTicketForPaidRegistration(payment);

  return payment;
}

/** Creates the delegate pass once, regardless of checkout/webhook retries. */
async function ensureTicketForPaidRegistration(payment: PaymentDocument): Promise<void> {
  // updateOne/upsert bypasses Mongoose schema defaults — soft-delete fields
  // must be written explicitly so the pre-find hook ({ isDeleted: false,
  // deletedAt: null }) can locate the document on subsequent reads.
  const qrToken = randomBytes(24).toString('hex');
  const ticketNumber = generateTicketNumber();

  const result = await TicketModel.findOneAndUpdate(
    { registrationId: payment.registrationId, isDeleted: false, deletedAt: null },
    {
      $setOnInsert: {
        registrationId: payment.registrationId,
        userId: payment.userId,
        eventId: payment.eventId,
        ticketNumber,
        qrToken,
        qrCode: 'pending-qr-generation',
        status: 'issued',
        issuedAt: new Date(),
        // Soft-delete defaults — not applied automatically on raw updateOne upserts.
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    },
    { upsert: true, new: false, projection: { _id: 1, ticketNumber: 1, qrToken: 1 } },
  )
    .lean()
    .exec();

  // result is null when the document was just inserted (new: false returns the
  // pre-update doc, which doesn't exist on insert). Dispatch QR generation only
  // for the winning insert — skip if the ticket already existed.
  if (result === null) {
    const inserted = await TicketModel.findOne(
      { registrationId: payment.registrationId, isDeleted: false, deletedAt: null },
      { _id: 1, ticketNumber: 1, qrToken: 1 },
    )
      .lean()
      .exec();

    if (inserted) {
      await dispatchQrJob({
        ticketId: String(inserted._id),
        ticketNumber: inserted.ticketNumber,
        qrToken: inserted.qrToken,
        userId: String(payment.userId),
        eventId: String(payment.eventId),
      });
    }
  }
}

async function markPaymentFailed(
  orderId: string,
  reason: string,
  webhookEventId?: string,
  gatewayPayment?: RazorpayPaymentEntity,
) {
  const payment = await PaymentModel.findOne({ orderId }).exec();
  if (!payment || payment.status === 'captured') return payment;

  payment.status = 'failed';
  payment.failureReason = reason;
  payment.metadata = {
    ...(payment.metadata ?? {}),
    gatewayPayment: gatewayPayment ?? (payment.metadata ?? {}).gatewayPayment,
    webhookEventIds: mergeWebhookEventId(payment.metadata?.webhookEventIds, webhookEventId),
  };
  await payment.save();

  await RegistrationModel.findByIdAndUpdate(payment.registrationId, {
    $set: { paymentStatus: 'failed' },
  }).exec();

  return payment;
}

function toOrderResponse(
  payment: PaymentDocument,
  input: {
    keyId: string;
    committee: { _id: unknown; name: string; abbr: string; type: string; capacity: number };
    event: { _id: unknown; name: string; startAt: Date; type: string };
    registration: RegistrationDocument;
  },
) {
  const feeBreakdown = (payment.metadata?.feeBreakdown ?? {}) as Partial<FeeBreakdown>;

  return {
    keyId: input.keyId,
    orderId: payment.orderId,
    receiptId: payment.receipt,
    registrationId: input.registration.id,
    amount: payment.amount,
    currency: payment.currency,
    status: mapPaymentStatus(payment.status),
    feeBreakdown,
    committee: {
      id: String(input.committee._id),
      name: input.committee.name,
      abbr: input.committee.abbr,
      type: input.committee.type,
      capacity: input.committee.capacity,
    },
    event: {
      id: String(input.event._id),
      name: input.event.name,
      date: input.event.startAt.toISOString(),
      type: input.event.type,
    },
  };
}

function toPaymentResponse(payment: PaymentDocument) {
  return {
    orderId: payment.orderId,
    paymentId: payment.paymentId,
    receiptId: payment.receipt,
    amount: payment.amount,
    currency: payment.currency,
    status: mapPaymentStatus(payment.status),
    failureReason: payment.failureReason,
    paidAt: payment.paidAt,
  };
}

function mapPaymentStatus(status: string) {
  if (status === 'captured') return 'success';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  if (status === 'authorized' || status === 'pending') return 'processing';
  return 'pending';
}

function toPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

function generateReceipt(): string {
  return `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateTicketNumber(): string {
  return `DP-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`.toUpperCase();
}

function generateRegistrationNumber(): string {
  return `MUN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function mergeWebhookEventId(existing: unknown, next?: string): string[] {
  const ids = Array.isArray(existing)
    ? existing.filter((id): id is string => typeof id === 'string')
    : [];
  if (next && !ids.includes(next)) ids.push(next);
  return ids;
}

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000,
  );
}
