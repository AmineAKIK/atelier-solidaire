import type {
  ReservationAttempt,
  ReservationAttemptStat,
} from '../domain/reservation.js'
import type { ReservationAttemptRepositoryPort } from '../repositories/reservation-attempt-repository.js'
import type { WorkshopRepositoryPort } from '../repositories/workshop-repository.js'

/** Minimal recorder consumed by ReservationService. */
export interface ReservationAttemptRecorder {
  recordNonBlocking(attempt: ReservationAttempt): void
}

/**
 * Records privacy-minimal attempts and exposes aggregated statistics.
 */
export class ReservationAttemptService implements ReservationAttemptRecorder {
  /**
   * Creates a reservation-attempt service.
   *
   * @param attempts - MongoDB repository for events and aggregations.
   * @param workshops - PostgreSQL lookup used to resolve validation attempts.
   */
  public constructor(
    private readonly attempts: ReservationAttemptRepositoryPort,
    private readonly workshops: WorkshopRepositoryPort,
  ) {}

  /**
   * Starts an attempt write without delaying or failing the reservation response.
   *
   * @param attempt - Event containing identifiers, outcome, reason, and timestamp only.
   */
  public recordNonBlocking(attempt: ReservationAttempt): void {
    void this.attempts.record(attempt).catch((error: unknown) => {
      console.warn('Reservation-attempt logging failed', error)
    })
  }

  /**
   * Records a validation failure while safely extracting only numeric identifiers.
   *
   * @param rawSlotId - Untrusted slotId value from the request body.
   * @param rawCategoryId - Untrusted categoryId value from the request body.
   * @param createdAt - Timestamp assigned to the attempt.
   */
  public recordValidationFailure(
    rawSlotId: unknown,
    rawCategoryId: unknown,
    createdAt: Date,
  ): void {
    const slotId = toPositiveIntegerOrNull(rawSlotId)
    const categoryId = toPositiveIntegerOrNull(rawCategoryId)

    void this.recordValidationFailureAsync(slotId, categoryId, createdAt)
  }

  /**
   * Returns grouped statistics for one validated workshop.
   *
   * @param workshopId - Positive workshop identifier.
   * @returns Counts grouped by outcome and reason.
   */
  public async getStats(workshopId: number): Promise<ReservationAttemptStat[]> {
    return this.attempts.getStats(workshopId)
  }

  /**
   * Checks whether the MongoDB logging store is reachable.
   *
   * @throws {Error} When MongoDB is unavailable.
   */
  public async ping(): Promise<void> {
    await this.attempts.ping()
  }

  private async recordValidationFailureAsync(
    slotId: number | null,
    categoryId: number | null,
    createdAt: Date,
  ): Promise<void> {
    let workshopId: number | null = null

    if (slotId !== null) {
      try {
        workshopId = await this.workshops.findWorkshopIdBySlotId(slotId)
      } catch (error) {
        console.warn('Workshop lookup for reservation-attempt logging failed', error)
      }
    }

    this.recordNonBlocking({
      workshopId,
      slotId,
      categoryId,
      outcome: 'refused',
      reason: 'validation_error',
      createdAt,
    })
  }
}

function toPositiveIntegerOrNull(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null
}

