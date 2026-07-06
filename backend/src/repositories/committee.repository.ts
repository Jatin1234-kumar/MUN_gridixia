import { Types } from 'mongoose';
import { CommitteeModel } from '../models/Committee';
import type { CreateCommitteeDto, UpdateCommitteeDto } from '../validators/committee.validator';

export const committeeRepository = {
  findAll() {
    return CommitteeModel.find({ isDeleted: { $ne: true } })
      .sort({ name: 1 })
      .exec();
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
