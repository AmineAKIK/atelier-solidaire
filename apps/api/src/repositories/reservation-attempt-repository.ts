import type { Collection, Db, MongoClient } from 'mongodb'

import type {
  ReservationAttempt,
  ReservationAttemptStat,
} from '../domain/reservation.js'

/** MongoDB port consumed by reservation-attempt services. */
export interface ReservationAttemptRepositoryPort {
  record(attempt: ReservationAttempt): Promise<void>
  getStats(workshopId: number): Promise<ReservationAttemptStat[]>
  ping(): Promise<void>
}

/**
 * Stores privacy-minimal reservation-attempt events in MongoDB.
 */
export class ReservationAttemptRepository
  implements ReservationAttemptRepositoryPort
{
  private readonly database: Db
  private readonly collection: Collection<ReservationAttempt>

  /**
   * Creates a reservation-attempt repository.
   *
   * @param client - Official MongoDB driver client.
   * @param databaseName - MongoDB database containing reservation_attempts.
   */
  public constructor(client: MongoClient, databaseName: string) {
    this.database = client.db(databaseName)
    this.collection = this.database.collection<ReservationAttempt>(
      'reservation_attempts',
    )
  }

  /**
   * Stores one attempt document without any personal participant fields.
   *
   * @param attempt - Privacy-minimal event to persist.
   */
  public async record(attempt: ReservationAttempt): Promise<void> {
    await this.collection.insertOne(attempt)
  }

  /**
   * Aggregates reservation outcomes and reasons for one validated workshop.
   *
   * @param workshopId - Positive workshop identifier validated by the HTTP layer.
   * @returns Sorted counts grouped by outcome and reason.
   */
  public async getStats(workshopId: number): Promise<ReservationAttemptStat[]> {
    return this.collection
      .aggregate<ReservationAttemptStat>([
        {
          $match: {
            workshopId,
          },
        },
        {
          $group: {
            _id: {
              outcome: '$outcome',
              reason: '$reason',
            },
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            '_id.outcome': 1,
            '_id.reason': 1,
          },
        },
        {
          $project: {
            _id: 0,
            outcome: '$_id.outcome',
            reason: '$_id.reason',
            count: 1,
          },
        },
      ])
      .toArray()
  }

  /**
   * Checks whether MongoDB is reachable.
   *
   * @throws {Error} When the MongoDB server cannot be reached.
   */
  public async ping(): Promise<void> {
    await this.database.command({ ping: 1 })
  }
}
