import { describe, expect, it, vi } from 'vitest'

import { BookingError } from '../../domain/errors.js'
import type {
  CreateReservationCommand,
  ReservationAttempt,
} from '../../domain/reservation.js'
import type {
  BookingContext,
  ReservationCapacity,
  ReservationRepositoryPort,
  ReservationTransactionPort,
} from '../../repositories/reservation-repository.js'
import type { WorkshopRepositoryPort } from '../../repositories/workshop-repository.js'
import type { Clock } from '../../services/clock.js'
import { ReservationAttemptService } from '../../services/reservation-attempt-service.js'
import { ReservationService } from '../../services/reservation-service.js'

const command: CreateReservationCommand = {
  slotId: 4,
  categoryId: 1,
  firstName: 'Alice',
  lastName: 'Example',
  email: 'alice@example.test',
  itemName: 'Laptop',
  problemDescription: 'Does not start.',
}

/** Deterministic clock used by ReservationService unit tests. */
class FixedClock implements Clock {
  /**
   * Creates a clock that always returns the same instant.
   *
   * @param instant - Fixed instant returned by now().
   */
  public constructor(private readonly instant: Date) {}

  /** Returns the configured fixed instant. */
  public now(): Date {
    return new Date(this.instant)
  }
}

/** In-memory transaction double for booking-rule unit tests. */
class FakeTransaction implements ReservationTransactionPort {
  public readonly insertReservation = vi.fn(async () => ({
    id: '10',
    publicToken: 'token',
    status: 'EXPECTED',
    createdAt: new Date('2026-09-26T08:00:00.000Z'),
  }))

  /**
   * Creates a transaction double.
   *
   * @param context - Booking context returned to the service.
   * @param capacity - Capacity values returned to the service.
   */
  public constructor(
    private readonly context: BookingContext | null,
    private readonly capacity: ReservationCapacity = {
      capacity: 2,
      reserved: 0,
    },
  ) {}

  /** Returns the configured booking context. */
  public async getBookingContextForUpdate(): Promise<BookingContext | null> {
    return this.context
  }

  /** Returns the configured capacity values. */
  public async getCapacity(): Promise<ReservationCapacity> {
    return this.capacity
  }
}

/** Repository double that executes work against one in-memory transaction. */
class FakeReservationRepository implements ReservationRepositoryPort {
  /**
   * Creates a reservation repository double.
   *
   * @param transaction - Transaction double exposed to ReservationService.
   */
  public constructor(public readonly transaction: FakeTransaction) {}

  /**
   * Executes reservation work without a real database transaction.
   *
   * @param work - ReservationService callback under test.
   * @returns The callback result.
   */
  public async withTransaction<T>(
    work: (transaction: ReservationTransactionPort) => Promise<T>,
  ): Promise<T> {
    return work(this.transaction)
  }
}

/** Captures non-blocking reservation-attempt events in memory. */
class CapturingAttemptRecorder {
  public readonly attempts: ReservationAttempt[] = []

  /**
   * Stores one emitted attempt for assertions.
   *
   * @param attempt - Reservation-attempt event emitted by the service.
   */
  public recordNonBlocking(attempt: ReservationAttempt): void {
    this.attempts.push(attempt)
  }
}

function openContext(overrides: Partial<BookingContext> = {}): BookingContext {
  return {
    workshopId: 2,
    bookingClosesAt: new Date('2026-10-09T07:00:00.000Z'),
    slotOpen: true,
    categoryOpen: true,
    ...overrides,
  }
}

describe('ReservationService', () => {
  it('creates a reservation and returns the remaining capacity', async () => {
    const transaction = new FakeTransaction(openContext(), {
      capacity: 3,
      reserved: 1,
    })
    const attempts = new CapturingAttemptRecorder()
    const service = new ReservationService(
      new FakeReservationRepository(transaction),
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    const result = await service.createReservation(command)

    expect(result.capacity).toEqual({
      total: 3,
      reserved: 2,
      remaining: 1,
    })
    expect(transaction.insertReservation).toHaveBeenCalledOnce()
    expect(attempts.attempts).toHaveLength(1)
    expect(attempts.attempts[0]).toMatchObject({
      workshopId: 2,
      slotId: 4,
      categoryId: 1,
      outcome: 'accepted',
      reason: 'created',
    })
  })

  it('throws slot_category_not_found when the pair does not exist', async () => {
    const attempts = new CapturingAttemptRecorder()
    const service = new ReservationService(
      new FakeReservationRepository(new FakeTransaction(null)),
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    await expect(service.createReservation(command)).rejects.toMatchObject({
      code: 'slot_category_not_found',
      status: 404,
    } satisfies Partial<BookingError>)

    expect(attempts.attempts[0]?.reason).toBe('slot_category_not_found')
  })

  it('throws booking_unavailable when the slot or category is closed', async () => {
    const attempts = new CapturingAttemptRecorder()
    const service = new ReservationService(
      new FakeReservationRepository(
        new FakeTransaction(openContext({ slotOpen: false })),
      ),
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    await expect(service.createReservation(command)).rejects.toMatchObject({
      code: 'booking_unavailable',
      status: 409,
    })

    expect(attempts.attempts[0]?.reason).toBe('booking_unavailable')
  })

  it('throws booking_closed at the exact closing second', async () => {
    const closing = new Date('2026-10-09T07:00:00.000Z')
    const attempts = new CapturingAttemptRecorder()
    const service = new ReservationService(
      new FakeReservationRepository(
        new FakeTransaction(openContext({ bookingClosesAt: closing })),
      ),
      attempts,
      new FixedClock(closing),
    )

    await expect(service.createReservation(command)).rejects.toMatchObject({
      code: 'booking_closed',
      status: 409,
    })

    expect(attempts.attempts[0]?.reason).toBe('booking_closed')
  })

  it('throws capacity_full without inserting a reservation', async () => {
    const transaction = new FakeTransaction(openContext(), {
      capacity: 1,
      reserved: 1,
    })
    const attempts = new CapturingAttemptRecorder()
    const service = new ReservationService(
      new FakeReservationRepository(transaction),
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    await expect(service.createReservation(command)).rejects.toMatchObject({
      code: 'capacity_full',
      status: 409,
      details: {
        capacity: 1,
        reserved: 1,
      },
    })

    expect(transaction.insertReservation).not.toHaveBeenCalled()
    expect(attempts.attempts[0]?.reason).toBe('capacity_full')
  })

  it('keeps a successful reservation successful when MongoDB logging fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const attemptRepository = {
      record: vi.fn().mockRejectedValue(new Error('Mongo unavailable')),
      getStats: vi.fn(),
      ping: vi.fn(),
    }
    const workshopRepository = {
      findAvailability: vi.fn(),
      findWorkshopIdBySlotId: vi.fn(),
      getHealth: vi.fn(),
    } satisfies WorkshopRepositoryPort
    const attempts = new ReservationAttemptService(
      attemptRepository,
      workshopRepository,
    )
    const service = new ReservationService(
      new FakeReservationRepository(new FakeTransaction(openContext())),
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    const result = await service.createReservation(command)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(result.reservation.id).toBe('10')
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })

  it('records exactly one internal_error attempt when PostgreSQL fails', async () => {
    const attempts = new CapturingAttemptRecorder()
    const repository: ReservationRepositoryPort = {
      async withTransaction<T>(): Promise<T> {
        throw new Error('PostgreSQL unavailable')
      },
    }
    const service = new ReservationService(
      repository,
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    await expect(service.createReservation(command)).rejects.toThrow(
      'PostgreSQL unavailable',
    )

    expect(attempts.attempts).toHaveLength(1)
    expect(attempts.attempts[0]).toMatchObject({
      workshopId: null,
      slotId: 4,
      categoryId: 1,
      outcome: 'refused',
      reason: 'internal_error',
    })
    expect(JSON.stringify(attempts.attempts[0])).not.toContain(command.email)
    expect(JSON.stringify(attempts.attempts[0])).not.toContain(command.lastName)
  })

  it('records no personal data in the reservation-attempt event', async () => {
    const attempts = new CapturingAttemptRecorder()
    const service = new ReservationService(
      new FakeReservationRepository(new FakeTransaction(openContext())),
      attempts,
      new FixedClock(new Date('2026-10-08T07:00:00.000Z')),
    )

    await service.createReservation(command)

    expect(Object.keys(attempts.attempts[0] ?? {}).sort()).toEqual(
      [
        'categoryId',
        'createdAt',
        'outcome',
        'reason',
        'slotId',
        'workshopId',
      ].sort(),
    )
    expect(JSON.stringify(attempts.attempts[0])).not.toContain(command.email)
    expect(JSON.stringify(attempts.attempts[0])).not.toContain(command.lastName)
  })
})
