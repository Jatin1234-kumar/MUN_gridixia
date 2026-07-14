import { Types } from 'mongoose';
import { CommitteeModel } from '../models/Committee';
import { RegistrationModel } from '../models/Registration';
import type { CreateCommitteeDto, UpdateCommitteeDto } from '../validators/committee.validator';

export const committeeRepository = {
  async findAll() {
    // Fetch committees and live member counts in parallel.
    // filledSeats on the Committee document is a denormalized counter that can
    // drift (e.g. registrations that pre-date the increment fix). We override it
    // with a live count from Registration so the UI is always accurate, and we
    // write the corrected value back for any committee whose counter is stale.
    const [committees, counts] = await Promise.all([
      CommitteeModel.find().sort({ name: 1 }).exec(),
      RegistrationModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            paymentStatus: 'paid',
            committeeId: { $ne: null },
            isDeleted: false,
            deletedAt: null,
          },
        },
        { $group: { _id: '$committeeId', count: { $sum: 1 } } },
      ]).exec(),
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    // Repair stale counters and return committees with live filledSeats.
    const repairOps: Promise<unknown>[] = [];
    for (const committee of committees) {
      const live = countMap.get(String(committee._id)) ?? 0;
      if (committee.filledSeats !== live) {
        repairOps.push(
          CommitteeModel.updateOne(
            { _id: committee._id },
            { $set: { filledSeats: live } },
          ).exec(),
        );
        committee.filledSeats = live;
      }
    }
    if (repairOps.length > 0) await Promise.all(repairOps);

    return committees;
  },

  findById(id: string) {
    return CommitteeModel.findById(id).exec();
  },

  findByEventId(eventId: string) {
    return CommitteeModel.find({ eventId: new Types.ObjectId(eventId) })
      .sort({ name: 1 })
      .exec();
  },

  findByAbbr(abbr: string) {
    return CommitteeModel.findOne({ abbr: abbr.toUpperCase(), isDeleted: { $ne: true } })
      .exec();
  },

  create(dto: CreateCommitteeDto) {
    return CommitteeModel.create({ ...dto, eventId: new Types.ObjectId(dto.eventId) });
  },

  update(id: string, dto: UpdateCommitteeDto) {
    return CommitteeModel.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
  },

  softDelete(id: string, deletedBy?: string) {
    return CommitteeModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy ? new Types.ObjectId(deletedBy) : null,
        },
      },
      { new: true },
    ).exec();
  },

  incrementFilledSeats(id: string, delta: 1 | -1) {
    const filter =
      delta === 1
        ? { _id: new Types.ObjectId(id), $expr: { $lt: ['$filledSeats', '$capacity'] } }
        : { _id: new Types.ObjectId(id), filledSeats: { $gt: 0 } };

    return CommitteeModel.findOneAndUpdate(filter, { $inc: { filledSeats: delta } }, { new: true })
      .exec();
  },
};
