import { BookingError } from '../domain/errors.js'
import type {
  CreateReservationCommand,
  ReservationAttemptReason,
  ReservationCreationResult,
} from '../domain/reservation.js'
import type { ReservationRepositoryPort } from '../repositories/reservation-repository.js'
import type { Clock } from './clock.js'
import type { ReservationAttemptRecorder } from './reservation-attempt-service.js'

/**
 * Applies reservation business rules independently from Express.
 */
export class ReservationService {
  /**
   * Creates a reservation service.
   *
   * @param reservations - Transactional PostgreSQL reservation repository.
   * @param attempts - Non-blocking reservation-attempt recorder.
   * @param clock - Injected clock used by the booking-closing rule.
   */
  public constructor(
    private readonly reservations: ReservationRepositoryPort,
    private readonly attempts: ReservationAttemptRecorder,
    private readonly clock: Clock,
  ) {}

  /**
   * Creates a reservation while preserving the existing capacity and booking rules.
   *
   * @param data - HTTP-validated participant and slot data.
   * @returns Created reservation and remaining capacity.
   * @throws {BookingError} When the slot/category is missing, unavailable, closed, or full.
   * @throws {unknown} When PostgreSQL fails unexpectedly.
   */
  public async createReservation(
    data: CreateReservationCommand,
  ): Promise<ReservationCreationResult> {
    let workshopId: number | null = null

    try {
      const result = await this.reservations.withTransaction(
        async (transaction) => {
          const context = await transaction.getBookingContextForUpdate(
            data.slotId,
            data.categoryId,
          )

          if (!context) {
            throw new BookingError('slot_category_not_found', 404)
          }

          workshopId = context.workshopId

          if (!context.slotOpen || !context.categoryOpen) {
            throw new BookingError('booking_unavailable', 409)
          }

          // The server remains authoritative for the T-24 closing rule.
          if (
            this.clock.now().getTime() >=
            new Date(context.bookingClosesAt).getTime()
          ) {
            throw new BookingError('booking_closed', 409)
          }

          const capacity = await transaction.getCapacity(
            data.slotId,
            data.categoryId,
          )

          if (capacity.reserved >= capacity.capacity) {
            throw new BookingError('capacity_full', 409, {
              capacity: capacity.capacity,
              reserved: capacity.reserved,
            })
          }

          const reservation = await transaction.insertReservation(data)

          return {
            reservation,
            capacity: {
              total: capacity.capacity,
              reserved: capacity.reserved + 1,
              remaining: Math.max(
                capacity.capacity - capacity.reserved - 1,
                0,
              ),
            },
          }
        },
      )

      this.attempts.recordNonBlocking({
        workshopId,
        slotId: data.slotId,
        categoryId: data.categoryId,
        outcome: 'accepted',
        reason: 'created',
        createdAt: this.clock.now(),
      })

      return result
    } catch (error) {
      const reason: ReservationAttemptReason =
        error instanceof BookingError ? error.code : 'internal_error'

      this.attempts.recordNonBlocking({
        workshopId,
        slotId: data.slotId,
        categoryId: data.categoryId,
        outcome: 'refused',
        reason,
        createdAt: this.clock.now(),
      })

      throw error
    }
  }
}
