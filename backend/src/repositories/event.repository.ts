import { Types } from 'mongoose';
import { EventModel } from '../models/Event';
import type { CreateEventDto, UpdateEventDto } from '../validators/event.validator';

export const eventRepository = {
  findAll() {
    return EventModel.find({ isDeleted: { $ne: true } })
      .sort({ startAt: -1 })
      .lean()
      .exec();
  },

  findById(id: string) {
    return EventModel.findById(id).lean().exec();
  },

  create(dto: CreateEventDto) {
    return EventModel.create({
      ...dto,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      registrationOpensAt: dto.registrationOpensAt ? new Date(dto.registrationOpensAt) : null,
      registrationClosesAt: dto.registrationClosesAt ? new Date(dto.registrationClosesAt) : null,
    });
  },

  update(id: string, dto: UpdateEventDto) {
    const update: Record<string, unknown> = { ...dto };
    if (dto.startAt) update.startAt = new Date(dto.startAt);
    if (dto.endAt) update.endAt = new Date(dto.endAt);
    if (dto.registrationOpensAt) update.registrationOpensAt = new Date(dto.registrationOpensAt);
    if (dto.registrationClosesAt) update.registrationClosesAt = new Date(dto.registrationClosesAt);

    return EventModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .lean()
      .exec();
  },

  softDelete(id: string, deletedBy?: string) {
    return EventModel.findByIdAndUpdate(
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
