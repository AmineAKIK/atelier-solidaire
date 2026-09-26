import { Router } from 'express'

import type { AvailabilityService } from '../../services/availability-service.js'
import { workshopIdSchema } from '../schemas.js'

/**
 * Creates the workshop HTTP router.
 *
 * @param availability - Business service for workshop availability.
 * @returns Thin Express router preserving the existing endpoint contract.
 */
export function createWorkshopsRouter(
  availability: AvailabilityService,
): Router {
  const router = Router()

  router.get('/:id/availability', async (request, response, next) => {
    const workshopId = workshopIdSchema.safeParse(request.params.id)

    if (!workshopId.success) {
      response.status(400).json({ code: 'invalid_workshop_id' })
      return
    }

    try {
      const result = await availability.getAvailability(workshopId.data)

      if (!result) {
        response.status(404).json({ code: 'workshop_not_found' })
        return
      }

      response.json(result)
    } catch (error) {
      next(error)
    }
  })

  return router
}
