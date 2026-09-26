import { Router } from 'express'

import type { HealthService } from '../../services/health-service.js'

/**
 * Creates the health router with separate PostgreSQL and MongoDB states.
 *
 * @param health - Health business service.
 * @returns Express router for /api/health.
 */
export function createHealthRouter(health: HealthService): Router {
  const router = Router()

  router.get('/health', async (_request, response, next) => {
    try {
      const result = await health.getHealth()

      if (result.postgresql.status === 'unavailable') {
        response.status(500).json({
          status: 'error',
          code: 'database_unavailable',
          postgresql: { status: 'unavailable' },
          mongodb: result.mongodb,
        })
        return
      }

      response.json({
        status: 'ok',
        database: result.postgresql.database,
        timezone: result.postgresql.timezone,
        now: result.postgresql.now,
        postgresql: result.postgresql,
        mongodb: result.mongodb,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
