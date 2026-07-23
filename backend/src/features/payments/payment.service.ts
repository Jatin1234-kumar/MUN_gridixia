import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { AuditLogModel } from '../../models/AuditLog';
import { dispatchQrJob } from '../../queues';
import { config } from '../../config';
import { AttendanceModel } from '../../models/Attendance';
import { EventModel } from '../../models/Event';
import { PaymentModel, type PaymentDocument } from '../../models/Payment';
import { TicketModel } from '../../models/Ticket';
import { RegistrationModel, type RegistrationDocument } from '../../models/Registration';
import { committeeRepository } from '../../repositories/committee.repository';
import { AppError } from '../../utils/AppError';
import {
  createRazorpayOrder,
  createRazorpayRefund,
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

    const committee = await committeeRepository.findById(input.committeeId);
    if (!committee) throw new AppError(404, 'Committee not found');
    if (committee.filledSeats >= committee.capacity) {
      throw new AppError(409, 'Committee is full. No seats available.');
    }

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
      committeeId: registration?.committeeId ? String(registration.committeeId) : undefined,
    });

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
      // New check-ins write an Attendance record. The registration fallback
      // keeps certificate access correct for passes scanned before that write
      // was added to the scanner flow.
      checkedIn:
        attendance?.status === 'present' ||
        registration.status === 'checked_in' ||
        registration.checkedInAt != null,
      registrationStatus: registration.status,
    };
  },

  async processRefund(registrationId: string, adminUserId: string) {
    const registration = await RegistrationModel.findById(registrationId).exec();
    if (!registration) throw new AppError(404, 'Registration not found');
    if (registration.refundStatus !== 'pending') {
      throw new AppError(
        409,
        `Refund is not in pending state (current: ${registration.refundStatus})`,
      );
    }

    const payment = await PaymentModel.findOne({
      registrationId: registration._id,
      status: 'captured',
    })
      .sort({ paidAt: -1 })
      .exec();
    if (!payment?.paymentId)
      throw new AppError(404, 'No captured payment found for this registration');

    try {
      const refund = await createRazorpayRefund({
        paymentId: payment.paymentId,
        amount: Math.round(payment.amount * 100), // rupees → paise
        notes: { registrationId, reason: 'committee_full_at_capture' },
      });

      payment.status = 'refunded';
      payment.refundedAmount = payment.amount;
      payment.refundedAt = new Date();
      await payment.save();

      await RegistrationModel.findByIdAndUpdate(registration._id, {
        $set: { paymentStatus: 'refunded', refundStatus: 'processed' },
      }).exec();

      await AuditLogModel.create({
        actorId: new Types.ObjectId(adminUserId),
        entityType: 'Payment',
        entityId: String(payment._id),
        action: 'refund',
        metadata: {
          razorpayRefundId: refund.id,
          refundedAmount: payment.amount,
          registrationId,
        },
      });

      return { refundId: refund.id, refundedAmount: payment.amount, status: 'processed' as const };
    } catch (err) {
      await RegistrationModel.findByIdAndUpdate(registration._id, {
        $set: { refundStatus: 'failed' },
      }).exec();

      await AuditLogModel.create({
        actorId: new Types.ObjectId(adminUserId),
        entityType: 'Payment',
        entityId: String(payment._id),
        action: 'refund',
        metadata: {
          error: err instanceof Error ? err.message : String(err),
          registrationId,
        },
      });

      throw err;
    }
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
        const registration = !wasAlreadyCaptured
          ? await RegistrationModel.findById(payment.registrationId).exec()
          : null;
        await capturePayment(payment, {
          paymentId: entity.id,
          signature: undefined,
          source: 'webhook',
          webhookEventId: eventId,
          gatewayPayment: entity,
          // Pass committeeId only on first capture so capturePayment can increment filledSeats.
          committeeId: registration?.committeeId ? String(registration.committeeId) : undefined,
        });
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
    // Provided only on the first capture; undefined on idempotent retries so
    // the filledSeats increment is not repeated.
    committeeId?: string;
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

  // Atomic seat claim: $expr guard + $inc in one findOneAndUpdate.
  // If null → committee filled up between order creation and capture (race).
  const seatClaimed =
    !input.committeeId ||
    (await committeeRepository.incrementFilledSeats(input.committeeId, 1)) !== null;

  if (!seatClaimed) {
    // Payment money is held by Razorpay — mark registration waitlisted so ops
    // can assign another committee or trigger a refund. No ticket or QR issued.
    await RegistrationModel.findByIdAndUpdate(payment.registrationId, {
      $set: { paymentStatus: 'paid', status: 'waitlisted', refundStatus: 'pending' },
    }).exec();

    await AuditLogModel.create({
      entityType: 'Registration',
      entityId: String(payment.registrationId),
      action: 'refund',
      metadata: {
        reason: 'committee_full_at_capture',
        committeeId: input.committeeId,
        paymentId: input.paymentId,
        orderId: payment.orderId,
      },
    });

    console.error(
      '[capturePayment] OVERSELL — committee full at capture, registration waitlisted',
      {
        committeeId: input.committeeId,
        registrationId: String(payment.registrationId),
        orderId: payment.orderId,
      },
    );

    return payment;
  }

  await RegistrationModel.findByIdAndUpdate(payment.registrationId, {
    $set: { paymentStatus: 'paid', status: 'confirmed' },
  }).exec();

  await ensureTicketForPaidRegistration(payment);

  return payment;
}

/** Creates the delegate pass once, regardless of checkout/webhook retries. */
async function ensureTicketForPaidRegistration(payment: PaymentDocument): Promise<void> {
  const qrToken = randomBytes(24).toString('hex');
  const ticketNumber = generateTicketNumber();
  // `qrCode` is covered by a unique index in existing deployments. Do not use
  // one shared placeholder, or a second paid registration will fail with E11000.
  const pendingQrCode = `pending-qr-generation:${qrToken}`;

  // $set repairs stuck tickets that were previously written with placeholder values
  // (e.g. ticketNumber: 'DP-PENDING') by an older code path.
  // $setOnInsert handles the fresh-insert case and writes soft-delete defaults
  // explicitly, because raw upserts bypass Mongoose schema defaults.
  const result = await TicketModel.findOneAndUpdate(
    { registrationId: payment.registrationId },
    {
      $set: {
        // Only overwrite when the ticket is still in the placeholder state.
        // For a real ticket these fields are already correct and the $set is a no-op
        // because we only reach here when qrCode === 'pending-qr-generation'.
      },
      $setOnInsert: {
        registrationId: payment.registrationId,
        userId: payment.userId,
        eventId: payment.eventId,
        ticketNumber,
        qrToken,
        qrCode: pendingQrCode,
        status: 'issued',
        issuedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    },
    { upsert: true, new: true, projection: { _id: 1, ticketNumber: 1, qrToken: 1, qrCode: 1 } },
  )
    .lean()
    .exec();

  if (!result) return;

  // Dispatch QR job when:
  //  (a) a new ticket was just inserted (qrCode is the placeholder), or
  //  (b) an existing ticket is still stuck with the placeholder (never got a job).
  if (
    result.qrCode === 'pending-qr-generation' ||
    result.qrCode.startsWith('pending-qr-generation:')
  ) {
    // Repair stuck tickets: write a real ticketNumber/qrToken if still placeholder.
    if (result.ticketNumber === 'DP-PENDING') {
      await TicketModel.updateOne({ _id: result._id }, { $set: { ticketNumber, qrToken } }).exec();
      result.ticketNumber = ticketNumber;
      result.qrToken = qrToken;
    }

    await dispatchQrJob({
      ticketId: String(result._id),
      ticketNumber: result.ticketNumber,
      qrToken: result.qrToken,
      userId: String(payment.userId),
      eventId: String(payment.eventId),
    });
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
