import { eventRepository } from '../repositories/event.repository';
import { CreateEventDto, UpdateEventDto } from '../validators/event.validator';
import { AppError } from '../utils/AppError';

export const eventService = {
  getAll() {
    return eventRepository.findAll();
  },

  getById(id: string) {
    const event = eventRepository.findById(id);
    if (!event) throw new AppError(404, `Event ${id} not found`);
    return event;
  },

  create(dto: CreateEventDto) {
    return eventRepository.create(dto);
  },

  update(id: string, dto: UpdateEventDto) {
    const event = eventRepository.update(id, dto);
    if (!event) throw new AppError(404, `Event ${id} not found`);
    return event;
  },

  delete(id: string) {
    const deleted = eventRepository.delete(id);
    if (!deleted) throw new AppError(404, `Event ${id} not found`);
  },
};
