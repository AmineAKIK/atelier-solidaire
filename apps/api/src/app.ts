import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'

import { errorHandler } from './http/middleware/error-handler.js'
import { createAdminRouter } from './http/routes/admin.js'
import { createHealthRouter } from './http/routes/health.js'
import { createReservationsRouter } from './http/routes/reservations.js'
import { createWorkshopsRouter } from './http/routes/workshops.js'
import type { AvailabilityService } from './services/availability-service.js'
import type { Clock } from './services/clock.js'
import type { HealthService } from './services/health-service.js'
import type { ReservationAttemptService } from './services/reservation-attempt-service.js'
import type { ReservationService } from './services/reservation-service.js'

/** Dependencies required to construct the HTTP application without global state. */
export interface AppDependencies {
  availabilityService: AvailabilityService
  reservationService: ReservationService
  reservationAttemptService: ReservationAttemptService
  healthService: HealthService
  clock: Clock
  frontendOrigin: string
  adminApiToken: string
}

/**
 * Creates the Express application with injected business dependencies.
 *
 * @param dependencies - Services and validated HTTP configuration.
 * @returns Configured Express application.
 */
export function createApp(dependencies: AppDependencies): Express {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === dependencies.frontendOrigin) {
          callback(null, true)
          return
        }

        callback(null, false)
      },
    }),
  )
  app.use(express.json({ limit: '10kb' }))

  app.use('/api', createHealthRouter(dependencies.healthService))
  app.use('/api/workshops', createWorkshopsRouter(dependencies.availabilityService))
  app.use(
    '/api/reservations',
    createReservationsRouter(
      dependencies.reservationService,
      dependencies.reservationAttemptService,
      dependencies.clock,
    ),
  )
  app.use(
    '/api/admin',
    createAdminRouter(
      dependencies.reservationAttemptService,
      dependencies.adminApiToken,
    ),
  )

  app.use(errorHandler)
  return app
}
