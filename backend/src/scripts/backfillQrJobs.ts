/**
 * One-time backfill: dispatches QR generation jobs for every ticket that was
 * created but never had a job enqueued (qrCode still holds the placeholder).
 *
 * Usage (from the backend/ directory):
 *   npm run backfill:qr
 *
 * Safe to re-run — BullMQ deduplicates by jobId (`qr:<ticketId>`), so
 * already-completed jobs are not re-queued.
 */

// Must be the very first import so env vars are populated before env.ts
// validates them at module-load time.
import 'dotenv/config';

import { connectMongo, disconnectMongo } from '../config/mongoose';
import { TicketModel } from '../models/Ticket';
import { dispatchQrJob } from '../queues';

async function main() {
  await connectMongo();

  const pending = await TicketModel.find(
    {
      $or: [
        // Include the legacy shared placeholder and the current unique form.
        { qrCode: { $regex: '^pending-qr-generation(?::|$)' } },
        { ticketNumber: 'DP-PENDING' },
      ],
      isDeleted: false,
      deletedAt: null,
    },
    { _id: 1, ticketNumber: 1, qrToken: 1, userId: 1, eventId: 1 },
  )
    .lean()
    .exec();

  if (pending.length === 0) {
    console.log('No pending QR tickets found — nothing to backfill.');
    return;
  }

  console.log(`Dispatching QR jobs for ${pending.length} ticket(s)…`);

  for (const ticket of pending) {
    await dispatchQrJob({
      ticketId: String(ticket._id),
      ticketNumber: ticket.ticketNumber,
      qrToken: ticket.qrToken,
      userId: String(ticket.userId),
      eventId: String(ticket.eventId),
    });
    console.log(`  queued: ${ticket.ticketNumber} (${String(ticket._id)})`);
  }

  console.log('Done.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
