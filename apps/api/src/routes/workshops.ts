import { Router } from 'express'

import { pool } from '../db/pool.js'

export const workshopsRouter = Router()

workshopsRouter.get('/:id/availability', async (req, res) => {
  const workshopId = Number(req.params.id)

  if (!Number.isInteger(workshopId) || workshopId <= 0) {
    return res.status(400).json({
      code: 'invalid_workshop_id',
    })
  }

  try {
    const workshopResult = await pool.query<{
      id: number
      title: string
      startsAt: Date
      endsAt: Date
      bookingClosesAt: Date
      locationName: string
      city: string
    }>(
      `
        SELECT
          id,
          title,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          booking_closes_at AS "bookingClosesAt",
          location_name AS "locationName",
          city
        FROM workshops
        WHERE id = $1
      `,
      [workshopId],
    )

    if (workshopResult.rowCount === 0) {
      return res.status(404).json({
        code: 'workshop_not_found',
      })
    }

    const availabilityResult = await pool.query(
      `
        SELECT
          s.id AS "slotId",
          s.arrival_at AS "arrivalAt",
          TO_CHAR(
            s.arrival_at AT TIME ZONE 'Europe/Paris',
            'HH24:MI'
          ) AS "localTime",

          c.id AS "categoryId",
          c.code AS "categoryCode",
          c.name AS "categoryName",

          COUNT(DISTINCT a.volunteer_id)::int AS "volunteers",

          (
            COUNT(DISTINCT a.volunteer_id)
            * (60 / c.capacity_unit_minutes)
          )::int AS "capacity",

          (
            COUNT(DISTINCT r.id)
            FILTER (
              WHERE r.status NOT IN ('CANCELLED', 'NO_SHOW')
            )
          )::int AS "reserved",

          GREATEST(
            (
              COUNT(DISTINCT a.volunteer_id)
              * (60 / c.capacity_unit_minutes)
            )
            -
            (
              COUNT(DISTINCT r.id)
              FILTER (
                WHERE r.status NOT IN ('CANCELLED', 'NO_SHOW')
              )
            ),
            0
          )::int AS "remaining"

        FROM arrival_slots s

        JOIN slot_categories sc
          ON sc.slot_id = s.id

        JOIN categories c
          ON c.id = sc.category_id

        LEFT JOIN volunteer_slot_assignments a
          ON a.slot_id = s.id
          AND a.category_id = c.id

        LEFT JOIN reservations r
          ON r.slot_id = s.id
          AND r.category_id = c.id

        WHERE
          s.workshop_id = $1
          AND s.is_open = TRUE
          AND sc.is_open = TRUE

        GROUP BY
          s.id,
          s.arrival_at,
          c.id,
          c.code,
          c.name,
          c.capacity_unit_minutes

        ORDER BY
          s.arrival_at,
          c.id
      `,
      [workshopId],
    )

    const workshop = workshopResult.rows[0]

    return res.json({
      workshop: {
        ...workshop,
        bookingOpen:
          Date.now() < new Date(workshop.bookingClosesAt).getTime(),
      },
      availability: availabilityResult.rows,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      code: 'internal_error',
    })
  }
})
