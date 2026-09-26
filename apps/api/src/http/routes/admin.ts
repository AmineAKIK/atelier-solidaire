import { Router } from 'express'

import type { ReservationAttemptService } from '../../services/reservation-attempt-service.js'
import { requireAdminToken } from '../middleware/require-admin-token.js'
import { reservationAttemptStatsQuerySchema } from '../schemas.js'

/**
 * Creates administrative statistics routes.
 *
 * @param attempts - Reservation-attempt statistics service.
 * @param adminToken - Validated bearer token for administrative access.
 * @returns Express router protected by constant-time token comparison.
 */
export function createAdminRouter(
  attempts: ReservationAttemptService,
  adminToken: string,
): Router {
  const router = Router()

  router.get(
    '/stats/reservation-attempts',
    requireAdminToken(adminToken),
    async (request, response, next) => {
      const parsed = reservationAttemptStatsQuerySchema.safeParse(request.query)

      if (!parsed.success) {
        response.status(400).json({ code: 'invalid_workshop_id' })
        return
      }

      try {
        response.json(await attempts.getStats(parsed.data.workshopId))
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
