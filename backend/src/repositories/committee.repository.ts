import { Types } from 'mongoose';
import { CommitteeModel } from '../models/Committee';
import type { CreateCommitteeDto, UpdateCommitteeDto } from '../validators/committee.validator';

export const committeeRepository = {
  findById(id: string) {
    return CommitteeModel.findById(id).lean().exec() as Promise<InstanceType<typeof CommitteeModel> | null>;
  },

  findByEventId(eventId: string) {
    return CommitteeModel.find({ eventId: new Types.ObjectId(eventId) }).sort({ name: 1 }).lean().exec();
  },

  create(dto: CreateCommitteeDto) {
    return CommitteeModel.create({ ...dto, eventId: new Types.ObjectId(dto.eventId) });
  },

  update(id: string, dto: UpdateCommitteeDto) {
    return CommitteeModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .lean()
      .exec() as Promise<InstanceType<typeof CommitteeModel> | null>;
  },

  softDelete(id: string, deletedBy?: string) {
    return CommitteeModel
      .findByIdAndUpdate(
        id,
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy ? new Types.ObjectId(deletedBy) : null } },
        { new: true },
      )
      .lean()
      .exec() as Promise<InstanceType<typeof CommitteeModel> | null>;
  },

  /**
   * Atomically increments filledSeats by `delta` only when result stays in [0, capacity].
   * Returns null when the guard fails.
   */
  incrementFilledSeats(id: string, delta: 1 | -1) {
    const filter =
      delta === 1
        ? { _id: new Types.ObjectId(id), $expr: { $lt: ['$filledSeats', '$capacity'] } }
        : { _id: new Types.ObjectId(id), filledSeats: { $gt: 0 } };

    return CommitteeModel
      .findOneAndUpdate(filter, { $inc: { filledSeats: delta } }, { new: true })
      .lean()
      .exec() as Promise<InstanceType<typeof CommitteeModel> | null>;
  },
};
