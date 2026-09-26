import type {
  AvailabilityRecord,
  WorkshopRecord,
  WorkshopRepositoryPort,
} from '../repositories/workshop-repository.js'
import type { Clock } from './clock.js'

/** Availability response kept compatible with the existing HTTP contract. */
export interface AvailabilityResult {
  workshop: WorkshopRecord & {
    bookingOpen: boolean
  }
  availability: AvailabilityRecord[]
}

/**
 * Applies time-dependent presentation rules to workshop availability data.
 */
export class AvailabilityService {
  /**
   * Creates an availability service.
   *
   * @param workshops - Workshop data repository.
   * @param clock - Clock used to calculate bookingOpen.
   */
  public constructor(
    private readonly workshops: WorkshopRepositoryPort,
    private readonly clock: Clock,
  ) {}

  /**
   * Loads availability for one workshop.
   *
   * @param workshopId - Positive workshop identifier.
   * @returns Contract-compatible availability data, or null when not found.
   */
  public async getAvailability(
    workshopId: number,
  ): Promise<AvailabilityResult | null> {
    const data = await this.workshops.findAvailability(workshopId)

    if (!data) {
      return null
    }

    return {
      workshop: {
        ...data.workshop,
        bookingOpen:
          this.clock.now().getTime() <
          new Date(data.workshop.bookingClosesAt).getTime(),
      },
      availability: data.availability,
    }
  }
}
