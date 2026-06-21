import { delegateRepository } from '../repositories/delegate.repository';
import { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';
import { AppError } from '../utils/AppError';

export const delegateService = {
  getAll() {
    return delegateRepository.findAll();
  },

  getById(id: string) {
    const delegate = delegateRepository.findById(id);
    if (!delegate) throw new AppError(404, `Delegate ${id} not found`);
    return delegate;
  },

  create(dto: CreateDelegateDto) {
    return delegateRepository.create(dto);
  },

  update(id: string, dto: UpdateDelegateDto) {
    const delegate = delegateRepository.update(id, dto);
    if (!delegate) throw new AppError(404, `Delegate ${id} not found`);
    return delegate;
  },

  delete(id: string) {
    const deleted = delegateRepository.delete(id);
    if (!deleted) throw new AppError(404, `Delegate ${id} not found`);
  },
};
