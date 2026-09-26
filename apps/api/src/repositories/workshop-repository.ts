import type { Pool } from 'pg'

/** Workshop data returned by PostgreSQL for the availability endpoint. */
export interface WorkshopRecord {
  id: string
  title: string
  startsAt: Date
  endsAt: Date
  bookingClosesAt: Date
  locationName: string
  city: string
}

/** Availability row returned by PostgreSQL without changing existing JSON field types. */
export interface AvailabilityRecord {
  slotId: string
  arrivalAt: Date
  localTime: string
  categoryId: number
  categoryCode: string
  categoryName: string
  volunteers: number
  capacity: number
  reserved: number
  remaining: number
}

/** Data bundle used by the availability business service. */
export interface WorkshopAvailabilityData {
  workshop: WorkshopRecord
  availability: AvailabilityRecord[]
}

/** PostgreSQL health values used by the health endpoint. */
export interface PostgresHealthRecord {
  database: string
  timezone: string
  now: Date
}

/** Port consumed by services that need workshop data. */
export interface WorkshopRepositoryPort {
  findAvailability(workshopId: number): Promise<WorkshopAvailabilityData | null>
  findWorkshopIdBySlotId(slotId: number): Promise<number | null>
  getHealth(): Promise<PostgresHealthRecord>
}

/**
 * Provides PostgreSQL read access for workshops and availability.
 */
export class WorkshopRepository implements WorkshopRepositoryPort {
  /**
   * Creates a workshop repository.
   *
   * @param pool - PostgreSQL connection pool.
   */
  public constructor(private readonly pool: Pool) {}

  /**
   * Loads workshop metadata and calculated availability.
   *
   * @param workshopId - Positive workshop identifier.
   * @returns Workshop data, or null when the workshop does not exist.
   */
  public async findAvailability(
    workshopId: number,
  ): Promise<WorkshopAvailabilityData | null> {
    const workshopResult = await this.pool.query<WorkshopRecord>(
      [
        'SELECT',
        '  id,',
        '  title,',
        '  starts_at AS "startsAt",',
        '  ends_at AS "endsAt",',
        '  booking_closes_at AS "bookingClosesAt",',
        '  location_name AS "locationName",',
        '  city',
        'FROM workshops',
        'WHERE id = $1',
      ].join('\n'),
      [workshopId],
    )

    if (workshopResult.rowCount === 0) {
      return null
    }

    const availabilityResult = await this.pool.query<AvailabilityRecord>(
      [
        'SELECT',
        '  s.id AS "slotId",',
        '  s.arrival_at AS "arrivalAt",',
        "  TO_CHAR(s.arrival_at AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS \"localTime\",",
        '  c.id AS "categoryId",',
        '  c.code AS "categoryCode",',
        '  c.name AS "categoryName",',
        '  COUNT(DISTINCT a.volunteer_id)::int AS "volunteers",',
        '  (COUNT(DISTINCT a.volunteer_id) * (60 / c.capacity_unit_minutes))::int AS "capacity",',
        "  (COUNT(DISTINCT r.id) FILTER (WHERE r.status NOT IN ('CANCELLED', 'NO_SHOW')))::int AS \"reserved\",",
        '  GREATEST(',
        '    (COUNT(DISTINCT a.volunteer_id) * (60 / c.capacity_unit_minutes))',
        "    - (COUNT(DISTINCT r.id) FILTER (WHERE r.status NOT IN ('CANCELLED', 'NO_SHOW'))),",
        '    0',
        '  )::int AS "remaining"',
        'FROM arrival_slots s',
        'JOIN slot_categories sc ON sc.slot_id = s.id',
        'JOIN categories c ON c.id = sc.category_id',
        'LEFT JOIN volunteer_slot_assignments a',
        '  ON a.slot_id = s.id AND a.category_id = c.id',
        'LEFT JOIN reservations r',
        '  ON r.slot_id = s.id AND r.category_id = c.id',
        'WHERE s.workshop_id = $1',
        '  AND s.is_open = TRUE',
        '  AND sc.is_open = TRUE',
        'GROUP BY s.id, s.arrival_at, c.id, c.code, c.name, c.capacity_unit_minutes',
        'ORDER BY s.arrival_at, c.id',
      ].join('\n'),
      [workshopId],
    )

    return {
      workshop: workshopResult.rows[0],
      availability: availabilityResult.rows,
    }
  }

  /**
   * Resolves a workshop identifier from a slot for validation-attempt statistics.
   *
   * @param slotId - Positive arrival-slot identifier.
   * @returns The owning workshop identifier, or null when the slot does not exist.
   * @throws {Error} When PostgreSQL returns an unsafe identifier.
   */
  public async findWorkshopIdBySlotId(slotId: number): Promise<number | null> {
    const result = await this.pool.query<{ workshopId: string }>(
      'SELECT workshop_id AS "workshopId" FROM arrival_slots WHERE id = $1',
      [slotId],
    )

    if (result.rowCount === 0) {
      return null
    }

    const workshopId = Number(result.rows[0].workshopId)

    if (!Number.isSafeInteger(workshopId) || workshopId <= 0) {
      throw new Error('PostgreSQL returned an unsafe workshop identifier')
    }

    return workshopId
  }

  /**
   * Reads PostgreSQL health metadata.
   *
   * @returns Database name, configured timezone, and database current time.
   */
  public async getHealth(): Promise<PostgresHealthRecord> {
    const result = await this.pool.query<PostgresHealthRecord>(
      [
        'SELECT',
        '  current_database() AS database,',
        "  current_setting('TIMEZONE') AS timezone,",
        '  NOW() AS now',
      ].join('\n'),
    )

    return result.rows[0]
  }
}
