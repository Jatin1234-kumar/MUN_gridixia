import { Types } from 'mongoose';
import { EventModel } from '../models/Event';
import { committeeRepository } from '../repositories/committee.repository';
import type { CreateCommitteeDto, UpdateCommitteeDto } from '../validators/committee.validator';
import { AppError } from '../utils/AppError';

export const committeeService = {
  async getAll() {
    return committeeRepository.findAll();
  },

  async getByEventId(eventId: string) {
    if (!Types.ObjectId.isValid(eventId)) throw new AppError(400, 'Invalid event ID');
    return committeeRepository.findByEventId(eventId);
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid committee ID');
    const committee = await committeeRepository.findById(id);
    if (!committee) throw new AppError(404, `Committee ${id} not found`);
    return committee;
  },

  async create(dto: CreateCommitteeDto) {
    if (!Types.ObjectId.isValid(dto.eventId)) throw new AppError(400, 'Invalid event ID');

    // Guard before DB round-trip
    if ((dto.filledSeats ?? 0) > dto.capacity) {
      throw new AppError(422, 'filledSeats cannot exceed capacity');
    }

    const event = await EventModel.findById(dto.eventId).lean().exec();
    if (!event) throw new AppError(404, `Event ${dto.eventId} not found`);

    return committeeRepository.create(dto);
  },

  async update(id: string, dto: UpdateCommitteeDto) {
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid committee ID');

    const existing = await committeeRepository.findById(id);
    if (!existing) throw new AppError(404, `Committee ${id} not found`);

    const newCapacity    = dto.capacity    ?? existing.capacity;
    const newFilledSeats = dto.filledSeats ?? existing.filledSeats;

    if (newFilledSeats > newCapacity) {
      throw new AppError(422, 'filledSeats cannot exceed capacity');
    }

    const updated = await committeeRepository.update(id, dto);
    if (!updated) throw new AppError(404, `Committee ${id} not found`);
    return updated;
  },

  async delete(id: string, deletedBy?: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid committee ID');
    const deleted = await committeeRepository.softDelete(id, deletedBy);
    if (!deleted) throw new AppError(404, `Committee ${id} not found`);
  },

  async incrementFilledSeats(id: string, delta: 1 | -1) {
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid committee ID');
    const updated = await committeeRepository.incrementFilledSeats(id, delta);
    if (!updated) {
      throw new AppError(
        409,
        delta === 1 ? 'Committee is at full capacity' : 'Committee already has 0 filled seats',
      );
    }
    return updated;
  },
};
