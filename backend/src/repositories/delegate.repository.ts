import { Types } from 'mongoose';
import { DelegateModel } from '../models/Delegate';
import type { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';

export const delegateRepository = {
  findAll() {
    return DelegateModel.find({ isDeleted: { $ne: true } })
      .sort({ name: 1 })
      .lean()
      .exec();
  },

  findById(id: string) {
    return DelegateModel.findById(id).lean().exec();
  },

  findByCommittee(committee: string) {
    return DelegateModel.find({ committee, isDeleted: { $ne: true } })
      .sort({ name: 1 })
      .lean()
      .exec();
  },

  create(dto: CreateDelegateDto) {
    return DelegateModel.create(dto);
  },

  update(id: string, dto: UpdateDelegateDto) {
    return DelegateModel.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .lean()
      .exec();
  },

  softDelete(id: string, deletedBy?: string) {
    return DelegateModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy ? new Types.ObjectId(deletedBy) : null,
        },
      },
      { new: true },
    )
      .lean()
      .exec();
  },
};
