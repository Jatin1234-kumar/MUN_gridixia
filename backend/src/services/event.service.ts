import { eventRepository } from '../repositories/event.repository';
import type { CreateEventDto, UpdateEventDto } from '../validators/event.validator';
import { AppError } from '../utils/AppError';

export const eventService = {
  async getAll() {
    return eventRepository.findAll();
  },

  async getById(id: string) {
    const event = await eventRepository.findById(id);
    if (!event) throw new AppError(404, `Event ${id} not found`);
    return event;
  },

  async create(dto: CreateEventDto) {
    return eventRepository.create(dto);
  },

  async update(id: string, dto: UpdateEventDto) {
    const event = await eventRepository.update(id, dto);
    if (!event) throw new AppError(404, `Event ${id} not found`);
    return event;
  },

  async delete(id: string) {
    const deleted = await eventRepository.softDelete(id);
    if (!deleted) throw new AppError(404, `Event ${id} not found`);
  },
};
