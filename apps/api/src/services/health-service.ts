import type { WorkshopRepositoryPort } from '../repositories/workshop-repository.js'
import type { ReservationAttemptService } from './reservation-attempt-service.js'

/** Health state for one external data store. */
export type DependencyHealthStatus = 'ok' | 'unavailable'

/** Combined PostgreSQL and MongoDB health information. */
export interface HealthResult {
  postgresql:
    | {
        status: 'ok'
        database: string
        timezone: string
        now: Date
      }
    | {
        status: 'unavailable'
      }
  mongodb: {
    status: DependencyHealthStatus
  }
}

/**
 * Checks PostgreSQL and MongoDB independently so MongoDB outages do not stop bookings.
 */
export class HealthService {
  /**
   * Creates a health service.
   *
   * @param workshops - Repository used for PostgreSQL health metadata.
   * @param attempts - Service used to ping the MongoDB logging store.
   */
  public constructor(
    private readonly workshops: WorkshopRepositoryPort,
    private readonly attempts: ReservationAttemptService,
  ) {}

  /**
   * Checks both data stores without coupling their availability.
   *
   * @returns Separate PostgreSQL and MongoDB health states.
   */
  public async getHealth(): Promise<HealthResult> {
    const [postgresql, mongodb] = await Promise.allSettled([
      this.workshops.getHealth(),
      this.attempts.ping(),
    ])

    return {
      postgresql:
        postgresql.status === 'fulfilled'
          ? {
              status: 'ok',
              ...postgresql.value,
            }
          : {
              status: 'unavailable',
            },
      mongodb: {
        status: mongodb.status === 'fulfilled' ? 'ok' : 'unavailable',
      },
    }
  }
}
