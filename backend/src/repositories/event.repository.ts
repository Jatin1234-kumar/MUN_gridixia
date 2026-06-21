import { Event } from '../types';
import { CreateEventDto, UpdateEventDto } from '../validators/event.validator';

const store = new Map<string, Event>();

export const eventRepository = {
  findAll(): Event[] {
    return Array.from(store.values());
  },

  findById(id: string): Event | undefined {
    return store.get(id);
  },

  create(dto: CreateEventDto): Event {
    const event: Event = {
      ...dto,
      id:            crypto.randomUUID(),
      status:        dto.status ?? 'pending',
      delegateCount: 0,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    };
    store.set(event.id, event);
    return event;
  },

  update(id: string, dto: UpdateEventDto): Event | undefined {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated: Event = { ...existing, ...dto, updatedAt: new Date() };
    store.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return store.delete(id);
  },
};
