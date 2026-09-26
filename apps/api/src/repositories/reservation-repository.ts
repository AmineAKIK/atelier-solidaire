import type { Pool, PoolClient } from 'pg'

import type {
  CreateReservationCommand,
  PersistedReservation,
} from '../domain/reservation.js'

/** Locked booking context used by reservation business rules. */
export interface BookingContext {
  workshopId: number
  bookingClosesAt: Date
  slotOpen: boolean
  categoryOpen: boolean
}

/** Capacity values calculated inside a reservation transaction. */
export interface ReservationCapacity {
  capacity: number
  reserved: number
}

/** Transaction operations consumed by ReservationService. */
export interface ReservationTransactionPort {
  getBookingContextForUpdate(
    slotId: number,
    categoryId: number,
  ): Promise<BookingContext | null>
  getCapacity(slotId: number, categoryId: number): Promise<ReservationCapacity>
  insertReservation(data: CreateReservationCommand): Promise<PersistedReservation>
}

/** Transaction boundary consumed by ReservationService. */
export interface ReservationRepositoryPort {
  withTransaction<T>(
    work: (transaction: ReservationTransactionPort) => Promise<T>,
  ): Promise<T>
}

class PostgresReservationTransaction implements ReservationTransactionPort {
  public constructor(private readonly client: PoolClient) {}

  /**
   * Locks the selected slot/category row so concurrent reservations are serialized.
   *
   * @param slotId - Arrival-slot identifier.
   * @param categoryId - Category identifier.
   * @returns Locked booking context, or null if the pair does not exist.
   */
  public async getBookingContextForUpdate(
    slotId: number,
    categoryId: number,
  ): Promise<BookingContext | null> {
    const result = await this.client.query<{
      workshopId: string
      bookingClosesAt: Date
      slotOpen: boolean
      categoryOpen: boolean
    }>(
      [
        'SELECT',
        '  w.id AS "workshopId",',
        '  w.booking_closes_at AS "bookingClosesAt",',
        '  s.is_open AS "slotOpen",',
        '  sc.is_open AS "categoryOpen"',
        'FROM slot_categories sc',
        'JOIN arrival_slots s ON s.id = sc.slot_id',
        'JOIN workshops w ON w.id = s.workshop_id',
        'WHERE sc.slot_id = $1 AND sc.category_id = $2',
        'FOR UPDATE OF sc',
      ].join('\n'),
      [slotId, categoryId],
    )

    if (result.rowCount === 0) {
      return null
    }

    const row = result.rows[0]
    const workshopId = Number(row.workshopId)

    if (!Number.isSafeInteger(workshopId) || workshopId <= 0) {
      throw new Error('PostgreSQL returned an unsafe workshop identifier')
    }

    return {
      workshopId,
      bookingClosesAt: row.bookingClosesAt,
      slotOpen: row.slotOpen,
      categoryOpen: row.categoryOpen,
    }
  }

  /**
   * Calculates total and already-reserved capacity for the selected pair.
   *
   * @param slotId - Arrival-slot identifier.
   * @param categoryId - Category identifier.
   * @returns Current capacity and reservation count.
   */
  public async getCapacity(
    slotId: number,
    categoryId: number,
  ): Promise<ReservationCapacity> {
    const result = await this.client.query<ReservationCapacity>(
      [
        'SELECT',
        '  (COUNT(DISTINCT a.volunteer_id) * (60 / c.capacity_unit_minutes))::int AS capacity,',
        "  (COUNT(DISTINCT r.id) FILTER (WHERE r.status NOT IN ('CANCELLED', 'NO_SHOW')))::int AS reserved",
        'FROM categories c',
        'LEFT JOIN volunteer_slot_assignments a',
        '  ON a.category_id = c.id AND a.slot_id = $1',
        'LEFT JOIN reservations r',
        '  ON r.category_id = c.id AND r.slot_id = $1',
        'WHERE c.id = $2',
        'GROUP BY c.capacity_unit_minutes',
      ].join('\n'),
      [slotId, categoryId],
    )

    return {
      capacity: result.rows[0]?.capacity ?? 0,
      reserved: result.rows[0]?.reserved ?? 0,
    }
  }

  /**
   * Persists one validated reservation using parameterized SQL only.
   *
   * @param data - Validated reservation data.
   * @returns The inserted reservation row.
   */
  public async insertReservation(
    data: CreateReservationCommand,
  ): Promise<PersistedReservation> {
    const result = await this.client.query<PersistedReservation>(
      [
        'INSERT INTO reservations (',
        '  slot_id, category_id, first_name, last_name, email, item_name, problem_description',
        ')',
        'VALUES ($1, $2, $3, $4, $5, $6, $7)',
        'RETURNING',
        '  id,',
        '  public_token AS "publicToken",',
        '  status,',
        '  created_at AS "createdAt"',
      ].join('\n'),
      [
        data.slotId,
        data.categoryId,
        data.firstName,
        data.lastName,
        data.email,
        data.itemName,
        data.problemDescription,
      ],
    )

    return result.rows[0]
  }
}

/**
 * Provides the PostgreSQL transaction boundary used by reservation creation.
 */
export class ReservationRepository implements ReservationRepositoryPort {
  /**
   * Creates a reservation repository.
   *
   * @param pool - PostgreSQL connection pool.
   */
  public constructor(private readonly pool: Pool) {}

  /**
   * Runs reservation work inside BEGIN/COMMIT and rolls back on any failure.
   *
   * @param work - Business callback executed with transaction-scoped data access.
   * @returns The callback result after a successful commit.
   * @throws {unknown} Re-throws callback or PostgreSQL errors after rollback.
   */
  public async withTransaction<T>(
    work: (transaction: ReservationTransactionPort) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await work(new PostgresReservationTransaction(client))
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
