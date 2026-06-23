import { delegateRepository } from '../repositories/delegate.repository';
import { committeeRepository } from '../repositories/committee.repository';
import type { CreateDelegateDto, UpdateDelegateDto } from '../validators/delegate.validator';
import { AppError } from '../utils/AppError';

export const delegateService = {
  async getAll() {
    return delegateRepository.findAll();
  },

  async getById(id: string) {
    const delegate = await delegateRepository.findById(id);
    if (!delegate) throw new AppError(404, `Delegate ${id} not found`);
    return delegate;
  },

  async create(dto: CreateDelegateDto) {
    const delegate = await delegateRepository.create(dto);
    const committee = await committeeRepository.findByAbbr(dto.committee);
    if (committee) {
      await committeeRepository.incrementFilledSeats(
        (committee._id as unknown as string).toString(),
        1,
      );
    }
    return delegate;
  },

  async update(id: string, dto: UpdateDelegateDto) {
    const delegate = await delegateRepository.update(id, dto);
    if (!delegate) throw new AppError(404, `Delegate ${id} not found`);
    return delegate;
  },

  async delete(id: string) {
    const delegate = await delegateRepository.findById(id);
    if (!delegate) throw new AppError(404, `Delegate ${id} not found`);
    const committee = await committeeRepository.findByAbbr(delegate.committee);
    if (committee) {
      await committeeRepository.incrementFilledSeats(
        (committee._id as unknown as string).toString(),
        -1,
      );
    }
    await delegateRepository.softDelete(id);
  },
};
