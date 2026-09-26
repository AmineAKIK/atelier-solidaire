import { Router } from 'express'

import type { Clock } from '../../services/clock.js'
import type { ReservationAttemptService } from '../../services/reservation-attempt-service.js'
import type { ReservationService } from '../../services/reservation-service.js'
import { createReservationSchema } from '../schemas.js'

/**
 * Creates the reservation HTTP router.
 *
 * @param reservations - Business service for reservation creation.
 * @param attempts - Non-blocking attempt journal and statistics service.
 * @param clock - Clock used to timestamp validation failures.
 * @returns Thin Express router preserving the existing POST contract.
 */
export function createReservationsRouter(
  reservations: ReservationService,
  attempts: ReservationAttemptService,
  clock: Clock,
): Router {
  const router = Router()

  router.post('/', async (request, response, next) => {
    const parsed = createReservationSchema.safeParse(request.body)

    if (!parsed.success) {
      const body = isRecord(request.body) ? request.body : {}

      attempts.recordValidationFailure(
        body.slotId,
        body.categoryId,
        clock.now(),
      )

      response.status(400).json({
        code: 'validation_error',
        errors: parsed.error.flatten(),
      })
      return
    }

    try {
      const result = await reservations.createReservation(parsed.data)
      response.status(201).json(result)
    } catch (error) {
      next(error)
    }
  })

  return router
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
