import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../config/mongoose';
import { TicketModel } from '../models/Ticket';

async function main() {
  await connectMongo();

  // Find tickets where isDeleted field is missing (undefined) — these are
  // invisible to Mongoose queries because the pre-hook appends { isDeleted: false }
  // which does not match a missing field in MongoDB.
  const result = await TicketModel.collection.updateMany(
    { isDeleted: { $exists: false } },
    { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
  );

  console.log(`Fixed ${result.modifiedCount} ticket(s) with missing isDeleted field.`);
}

main()
  .catch(console.error)
  .finally(() => disconnectMongo());
