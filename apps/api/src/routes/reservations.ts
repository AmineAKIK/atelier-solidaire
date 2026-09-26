import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../db/pool.js'

export const reservationsRouter = Router()

const createReservationSchema = z.object({
  slotId: z.number().int().positive(),
  categoryId: z.number().int().positive(),

  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),

  email: z.string().trim().email().max(255),

  itemName: z.string().trim().min(1).max(160),
  problemDescription: z.string().trim().min(1).max(2000),
})

reservationsRouter.post('/', async (req, res) => {
  const parsed = createReservationSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      code: 'validation_error',
      errors: parsed.error.flatten(),
    })
  }

  const data = parsed.data
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    /*
     * On verrouille l'association créneau/catégorie pendant
     * la vérification et la création de la réservation.
     *
     * Deux créations concurrentes visant exactement le même
     * créneau et la même catégorie seront ainsi sérialisées.
     */
    const contextResult = await client.query<{
      bookingClosesAt: Date
      slotOpen: boolean
      categoryOpen: boolean
    }>(
      `
        SELECT
          w.booking_closes_at AS "bookingClosesAt",
          s.is_open AS "slotOpen",
          sc.is_open AS "categoryOpen"

        FROM slot_categories sc

        JOIN arrival_slots s
          ON s.id = sc.slot_id

        JOIN workshops w
          ON w.id = s.workshop_id

        WHERE
          sc.slot_id = $1
          AND sc.category_id = $2

        FOR UPDATE OF sc
      `,
      [data.slotId, data.categoryId],
    )

    if (contextResult.rowCount === 0) {
      await client.query('ROLLBACK')

      return res.status(404).json({
        code: 'slot_category_not_found',
      })
    }

    const context = contextResult.rows[0]

    if (!context.slotOpen || !context.categoryOpen) {
      await client.query('ROLLBACK')

      return res.status(409).json({
        code: 'booking_unavailable',
      })
    }

    /*
     * La fermeture T-24 est imposée côté serveur.
     * Le navigateur n'est donc pas l'autorité de cette règle.
     */
    if (
      Date.now() >=
      new Date(context.bookingClosesAt).getTime()
    ) {
      await client.query('ROLLBACK')

      return res.status(409).json({
        code: 'booking_closed',
      })
    }

    const capacityResult = await client.query<{
      capacity: number
      reserved: number
    }>(
      `
        SELECT
          (
            COUNT(DISTINCT a.volunteer_id)
            * (60 / c.capacity_unit_minutes)
          )::int AS capacity,

          (
            COUNT(DISTINCT r.id)
            FILTER (
              WHERE r.status NOT IN ('CANCELLED', 'NO_SHOW')
            )
          )::int AS reserved

        FROM categories c

        LEFT JOIN volunteer_slot_assignments a
          ON a.category_id = c.id
          AND a.slot_id = $1

        LEFT JOIN reservations r
          ON r.category_id = c.id
          AND r.slot_id = $1

        WHERE c.id = $2

        GROUP BY c.capacity_unit_minutes
      `,
      [data.slotId, data.categoryId],
    )

    const capacity = capacityResult.rows[0]?.capacity ?? 0
    const reserved = capacityResult.rows[0]?.reserved ?? 0

    if (reserved >= capacity) {
      await client.query('ROLLBACK')

      return res.status(409).json({
        code: 'capacity_full',
        capacity,
        reserved,
      })
    }

    const insertResult = await client.query<{
      id: number
      publicToken: string
      status: string
      createdAt: Date
    }>(
      `
        INSERT INTO reservations (
          slot_id,
          category_id,
          first_name,
          last_name,
          email,
          item_name,
          problem_description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)

        RETURNING
          id,
          public_token AS "publicToken",
          status,
          created_at AS "createdAt"
      `,
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

    await client.query('COMMIT')

    return res.status(201).json({
      reservation: insertResult.rows[0],
      capacity: {
        total: capacity,
        reserved: reserved + 1,
        remaining: Math.max(capacity - reserved - 1, 0),
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')

    console.error(error)

    return res.status(500).json({
      code: 'internal_error',
    })
  } finally {
    client.release()
  }
})
