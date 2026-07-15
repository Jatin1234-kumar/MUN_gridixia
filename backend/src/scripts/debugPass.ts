import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../config/mongoose';
import { TicketModel } from '../models/Ticket';
import { RegistrationModel } from '../models/Registration';
import { dispatchQrJob } from '../queues';
import { Types } from 'mongoose';

async function main() {
  await connectMongo();

  // ── 1. For user 6a55fbec: keep only the registration that has a ticket ──
  const USER_ID = new Types.ObjectId('6a55fbecf5e623e8766ca72a');
  const KEEP_REG_ID = new Types.ObjectId('6a55fcaaf5e623e8766ca74e'); // has ticket

  const deleted = await RegistrationModel.collection.deleteMany({
    userId: USER_ID,
    _id: { $ne: KEEP_REG_ID },
  });
  console.log(`Deleted ${deleted.deletedCount} duplicate registration(s) for user 6a55fbec`);

  // ── 2. Fix the stuck ticket (qrCode = 'pending-qr-generation', 21 chars) ──
  const stuckTicket = await TicketModel.collection.findOne({
    qrCode: 'pending-qr-generation',
  });

  if (stuckTicket) {
    await dispatchQrJob({
      ticketId: String(stuckTicket._id),
      ticketNumber: stuckTicket.ticketNumber,
      qrToken: stuckTicket.qrToken,
      userId: String(stuckTicket.userId),
      eventId: String(stuckTicket.eventId),
    });
    console.log(`Dispatched QR job for stuck ticket: ${stuckTicket.ticketNumber}`);
  } else {
    console.log('No stuck tickets found.');
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => disconnectMongo());
