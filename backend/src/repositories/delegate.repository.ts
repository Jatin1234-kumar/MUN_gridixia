import { Delegate } from '../types';
import { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';

const store = new Map<string, Delegate>();

export const delegateRepository = {
  findAll(): Delegate[] {
    return Array.from(store.values());
  },

  findById(id: string): Delegate | undefined {
    return store.get(id);
  },

  findByCommittee(committee: string): Delegate[] {
    return Array.from(store.values()).filter((d) => d.committee === committee);
  },

  create(dto: CreateDelegateDto): Delegate {
    const delegate: Delegate = {
      ...dto,
      id:           crypto.randomUUID(),
      status:       'pending',
      registeredAt: new Date().toISOString(),
      createdAt:    new Date(),
      updatedAt:    new Date(),
    };
    store.set(delegate.id, delegate);
    return delegate;
  },

  update(id: string, dto: UpdateDelegateDto): Delegate | undefined {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated: Delegate = { ...existing, ...dto, updatedAt: new Date() };
    store.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return store.delete(id);
  },
};
