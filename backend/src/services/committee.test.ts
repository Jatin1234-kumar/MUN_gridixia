import { AppError } from '../utils/AppError';
import type { CreateCommitteeDto } from '../validators/committee.validator';

// Manual mocks declared before any imports that trigger them
const mockFindById             = jest.fn();
const mockFindByEventId        = jest.fn();
const mockCreate               = jest.fn();
const mockUpdate               = jest.fn();
const mockSoftDelete           = jest.fn();
const mockIncrementFilledSeats = jest.fn();
const mockEventFindById        = jest.fn();

jest.mock('../repositories/committee.repository', () => ({
  committeeRepository: {
    findById:             (...a: unknown[]) => mockFindById(...a),
    findByEventId:        (...a: unknown[]) => mockFindByEventId(...a),
    create:               (...a: unknown[]) => mockCreate(...a),
    update:               (...a: unknown[]) => mockUpdate(...a),
    softDelete:           (...a: unknown[]) => mockSoftDelete(...a),
    incrementFilledSeats: (...a: unknown[]) => mockIncrementFilledSeats(...a),
  },
}));

jest.mock('../models/Event', () => ({
  EventModel: {
    findById: (...a: unknown[]) => mockEventFindById(...a),
  },
}));

import { committeeService } from './committee.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_EVENT_ID = '64b1f1c2e1d2a3b4c5d6e7f8';
const VALID_ID       = '64b1f1c2e1d2a3b4c5d6e7f9';
const INVALID_ID     = 'not-an-objectid';

const BASE_COMMITTEE = {
  id: VALID_ID,
  eventId: VALID_EVENT_ID,
  name: 'UN Security Council',
  abbr: 'UNSC',
  agenda: 'Non-proliferation of nuclear weapons',
  topic: 'Security',
  type: 'MUN' as const,
  difficulty: 'advanced' as const,
  capacity: 15,
  filledSeats: 5,
  isLocked: false,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
};

const CREATE_DTO: CreateCommitteeDto = {
  eventId:     VALID_EVENT_ID,
  name:        'UN Security Council',
  abbr:        'UNSC',
  agenda:      'Non-proliferation of nuclear weapons',
  topic:       'Security',
  type:        'MUN',
  difficulty:  'advanced',
  capacity:    15,
  filledSeats: 0,
};

// EventModel.findById().lean().exec() chain
function eventQ(value: unknown) {
  const exec = jest.fn().mockResolvedValue(value);
  const lean = jest.fn().mockReturnValue({ exec });
  return { lean };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEventFindById.mockReturnValue(eventQ({ _id: VALID_EVENT_ID }));
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('committeeService.getById', () => {
  it('returns committee when found', async () => {
    mockFindById.mockResolvedValue(BASE_COMMITTEE);
    expect(await committeeService.getById(VALID_ID)).toEqual(BASE_COMMITTEE);
  });

  it('throws 404 when not found', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(committeeService.getById(VALID_ID))
      .rejects.toThrow(new AppError(404, `Committee ${VALID_ID} not found`));
  });

  it('throws 400 for invalid ID', async () => {
    await expect(committeeService.getById(INVALID_ID))
      .rejects.toThrow(new AppError(400, 'Invalid committee ID'));
  });
});

// ── getByEventId ──────────────────────────────────────────────────────────────

describe('committeeService.getByEventId', () => {
  it('returns committees for a valid event', async () => {
    mockFindByEventId.mockResolvedValue([BASE_COMMITTEE]);
    const result = await committeeService.getByEventId(VALID_EVENT_ID);
    expect(result).toHaveLength(1);
    expect(mockFindByEventId).toHaveBeenCalledWith(VALID_EVENT_ID);
  });

  it('throws 400 for invalid event ID', async () => {
    await expect(committeeService.getByEventId(INVALID_ID))
      .rejects.toThrow(new AppError(400, 'Invalid event ID'));
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe('committeeService.create', () => {
  it('creates a committee when event exists', async () => {
    mockCreate.mockResolvedValue(BASE_COMMITTEE);
    expect(await committeeService.create(CREATE_DTO)).toEqual(BASE_COMMITTEE);
    expect(mockCreate).toHaveBeenCalledWith(CREATE_DTO);
  });

  it('throws 404 when event does not exist', async () => {
    mockEventFindById.mockReturnValue(eventQ(null));
    await expect(committeeService.create(CREATE_DTO))
      .rejects.toThrow(new AppError(404, `Event ${VALID_EVENT_ID} not found`));
  });

  it('throws 422 when filledSeats exceeds capacity', async () => {
    await expect(committeeService.create({ ...CREATE_DTO, filledSeats: 20, capacity: 15 }))
      .rejects.toThrow(new AppError(422, 'filledSeats cannot exceed capacity'));
  });

  it('throws 400 for invalid event ID', async () => {
    await expect(committeeService.create({ ...CREATE_DTO, eventId: INVALID_ID }))
      .rejects.toThrow(new AppError(400, 'Invalid event ID'));
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('committeeService.update', () => {
  it('updates a committee', async () => {
    mockFindById.mockResolvedValue(BASE_COMMITTEE);
    mockUpdate.mockResolvedValue({ ...BASE_COMMITTEE, name: 'UNSC Updated' });
    const result = await committeeService.update(VALID_ID, { name: 'UNSC Updated' });
    expect(result.name).toBe('UNSC Updated');
  });

  it('throws 404 when not found on lookup', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(committeeService.update(VALID_ID, { name: 'X' }))
      .rejects.toThrow(new AppError(404, `Committee ${VALID_ID} not found`));
  });

  it('throws 422 when reducing capacity below filledSeats', async () => {
    mockFindById.mockResolvedValue(BASE_COMMITTEE); // filledSeats=5
    await expect(committeeService.update(VALID_ID, { capacity: 3 }))
      .rejects.toThrow(new AppError(422, 'filledSeats cannot exceed capacity'));
  });

  it('throws 422 when setting filledSeats above existing capacity', async () => {
    mockFindById.mockResolvedValue(BASE_COMMITTEE); // capacity=15
    await expect(committeeService.update(VALID_ID, { filledSeats: 16 }))
      .rejects.toThrow(new AppError(422, 'filledSeats cannot exceed capacity'));
  });

  it('throws 400 for invalid ID', async () => {
    await expect(committeeService.update(INVALID_ID, {}))
      .rejects.toThrow(new AppError(400, 'Invalid committee ID'));
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe('committeeService.delete', () => {
  it('soft-deletes a committee', async () => {
    mockSoftDelete.mockResolvedValue(BASE_COMMITTEE);
    await expect(committeeService.delete(VALID_ID)).resolves.toBeUndefined();
    expect(mockSoftDelete).toHaveBeenCalledWith(VALID_ID, undefined);
  });

  it('passes actorId to repository', async () => {
    mockSoftDelete.mockResolvedValue(BASE_COMMITTEE);
    await committeeService.delete(VALID_ID, 'actor-id');
    expect(mockSoftDelete).toHaveBeenCalledWith(VALID_ID, 'actor-id');
  });

  it('throws 404 when not found', async () => {
    mockSoftDelete.mockResolvedValue(null);
    await expect(committeeService.delete(VALID_ID))
      .rejects.toThrow(new AppError(404, `Committee ${VALID_ID} not found`));
  });

  it('throws 400 for invalid ID', async () => {
    await expect(committeeService.delete(INVALID_ID))
      .rejects.toThrow(new AppError(400, 'Invalid committee ID'));
  });
});

// ── incrementFilledSeats ──────────────────────────────────────────────────────

describe('committeeService.incrementFilledSeats', () => {
  it('increments filled seats', async () => {
    mockIncrementFilledSeats.mockResolvedValue({ ...BASE_COMMITTEE, filledSeats: 6 });
    const result = await committeeService.incrementFilledSeats(VALID_ID, 1);
    expect(result.filledSeats).toBe(6);
  });

  it('decrements filled seats', async () => {
    mockIncrementFilledSeats.mockResolvedValue({ ...BASE_COMMITTEE, filledSeats: 4 });
    const result = await committeeService.incrementFilledSeats(VALID_ID, -1);
    expect(result.filledSeats).toBe(4);
  });

  it('throws 409 when at capacity (guard returns null)', async () => {
    mockIncrementFilledSeats.mockResolvedValue(null);
    await expect(committeeService.incrementFilledSeats(VALID_ID, 1))
      .rejects.toThrow(new AppError(409, 'Committee is at full capacity'));
  });

  it('throws 409 when already at 0 seats (guard returns null)', async () => {
    mockIncrementFilledSeats.mockResolvedValue(null);
    await expect(committeeService.incrementFilledSeats(VALID_ID, -1))
      .rejects.toThrow(new AppError(409, 'Committee already has 0 filled seats'));
  });

  it('throws 400 for invalid ID', async () => {
    await expect(committeeService.incrementFilledSeats(INVALID_ID, 1))
      .rejects.toThrow(new AppError(400, 'Invalid committee ID'));
  });
});
