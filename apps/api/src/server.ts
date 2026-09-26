import 'dotenv/config'

import { MongoClient } from 'mongodb'
import pg from 'pg'

import { createApp } from './app.js'
import { getMongoDatabaseName, loadEnvironment } from './config/env.js'
import { ReservationAttemptRepository } from './repositories/reservation-attempt-repository.js'
import { ReservationRepository } from './repositories/reservation-repository.js'
import { WorkshopRepository } from './repositories/workshop-repository.js'
import { AvailabilityService } from './services/availability-service.js'
import { SystemClock } from './services/clock.js'
import { HealthService } from './services/health-service.js'
import { ReservationAttemptService } from './services/reservation-attempt-service.js'
import { ReservationService } from './services/reservation-service.js'

const { Pool } = pg
const environment = loadEnvironment(process.env)

const pool = new Pool({ connectionString: environment.DATABASE_URL })
const mongoClient = new MongoClient(environment.MONGODB_URL, {
  serverSelectionTimeoutMS: 500,
})

const workshopRepository = new WorkshopRepository(pool)
const reservationRepository = new ReservationRepository(pool)
const reservationAttemptRepository = new ReservationAttemptRepository(
  mongoClient,
  getMongoDatabaseName(environment.MONGODB_URL),
)
const clock = new SystemClock()
const reservationAttemptService = new ReservationAttemptService(
  reservationAttemptRepository,
  workshopRepository,
)
const availabilityService = new AvailabilityService(workshopRepository, clock)
const reservationService = new ReservationService(
  reservationRepository,
  reservationAttemptService,
  clock,
)
const healthService = new HealthService(
  workshopRepository,
  reservationAttemptService,
)

const app = createApp({
  availabilityService,
  reservationService,
  reservationAttemptService,
  healthService,
  clock,
  frontendOrigin: environment.FRONTEND_ORIGIN,
  adminApiToken: environment.ADMIN_API_TOKEN,
})

const server = app.listen(environment.PORT, () => {
  console.log(
    'Atelier Solidaire API listening on http://localhost:' + environment.PORT,
  )
})

async function shutdown(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

  await Promise.all([pool.end(), mongoClient.close()])
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error(error)
        process.exit(1)
      },
    )
  })
}
