import { MongoClient } from 'mongodb'
import pg from 'pg'
import request from 'supertest'
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest'

import { createApp } from '../../app.js'
import { getMongoDatabaseName } from '../../config/env.js'
import { ReservationAttemptRepository } from '../../repositories/reservation-attempt-repository.js'
import { ReservationRepository } from '../../repositories/reservation-repository.js'
import { WorkshopRepository } from '../../repositories/workshop-repository.js'
import { AvailabilityService } from '../../services/availability-service.js'
import { SystemClock } from '../../services/clock.js'
import { HealthService } from '../../services/health-service.js'
import { ReservationAttemptService } from '../../services/reservation-attempt-service.js'
import { ReservationService } from '../../services/reservation-service.js'

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL ?? ''
const mongodbUrl = process.env.MONGODB_URL ?? ''
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const adminToken =
  process.env.ADMIN_API_TOKEN ?? '0123456789abcdef0123456789abcdef'

const postgresDatabaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
const mongoDatabaseName = getMongoDatabaseName(mongodbUrl)

if (!postgresDatabaseName.endsWith('_test')) {
  throw new Error('Integration tests require a PostgreSQL database ending in _test')
}

if (!mongoDatabaseName.endsWith('_test')) {
  throw new Error('Integration tests require a MongoDB database ending in _test')
}

const pool = new Pool({ connectionString: databaseUrl })
const mongoClient = new MongoClient(mongodbUrl, {
  serverSelectionTimeoutMS: 1000,
})
const workshopRepository = new WorkshopRepository(pool)
const reservationRepository = new ReservationRepository(pool)
const attemptRepository = new ReservationAttemptRepository(
  mongoClient,
  mongoDatabaseName,
)
const clock = new SystemClock()
const attemptService = new ReservationAttemptService(
  attemptRepository,
  workshopRepository,
)
const reservationService = new ReservationService(
  reservationRepository,
  attemptService,
  clock,
)
const availabilityService = new AvailabilityService(
  workshopRepository,
  clock,
)
const healthService = new HealthService(workshopRepository, attemptService)
const app = createApp({
  availabilityService,
  reservationService,
  reservationAttemptService: attemptService,
  healthService,
  clock,
  frontendOrigin,
  adminApiToken: adminToken,
})

interface Fixture {
  workshopId: number
  slotId: number
  categoryId: number
  volunteerId: number
}

let fixtureSequence = 0

beforeAll(async () => {
  await mongoClient.connect()
  await mongoClient
    .db(mongoDatabaseName)
    .collection('reservation_attempts')
    .deleteMany({})
})

afterAll(async () => {
  await mongoClient
    .db(mongoDatabaseName)
    .collection('reservation_attempts')
    .deleteMany({})
  await Promise.all([pool.end(), mongoClient.close()])
})

async function createFixture(options: { bookingClosed?: boolean } = {}): Promise<Fixture> {
  fixtureSequence += 1
  const suffix = process.pid + '-' + fixtureSequence

  const workshop = await pool.query<{ id: string }>(
    [
      'INSERT INTO workshops (',
      '  title, starts_at, ends_at, booking_closes_at, location_name, city',
      ')',
      'VALUES (',
      "  $1, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 4 hours',",
      options.bookingClosed
        ? "  NOW() - INTERVAL '1 minute', $2, 'Angers'"
        : "  NOW() + INTERVAL '2 days', $2, 'Angers'",
      ')',
      'RETURNING id',
    ].join('\n'),
    ['Integration workshop ' + suffix, 'Integration location ' + suffix],
  )

  const workshopId = Number(workshop.rows[0].id)
  const category = await pool.query<{ id: number }>(
    "SELECT id FROM categories WHERE code = 'IT'",
  )
  const categoryId = category.rows[0].id

  const slot = await pool.query<{ id: string }>(
    [
      'INSERT INTO arrival_slots (workshop_id, arrival_at, window_minutes)',
      "VALUES ($1, NOW() + INTERVAL '3 days', 60)",
      'RETURNING id',
    ].join('\n'),
    [workshopId],
  )
  const slotId = Number(slot.rows[0].id)

  await pool.query(
    'INSERT INTO slot_categories (slot_id, category_id) VALUES ($1, $2)',
    [slotId, categoryId],
  )

  const volunteer = await pool.query<{ id: string }>(
    [
      'INSERT INTO volunteers (first_name, last_name, email)',
      'VALUES ($1, $2, $3)',
      'RETURNING id',
    ].join('\n'),
    ['Integration', 'Volunteer', 'integration-' + suffix + '@example.test'],
  )
  const volunteerId = Number(volunteer.rows[0].id)

  await pool.query(
    'INSERT INTO volunteer_skills (volunteer_id, category_id) VALUES ($1, $2)',
    [volunteerId, categoryId],
  )
  await pool.query(
    [
      'INSERT INTO volunteer_slot_assignments (volunteer_id, slot_id, category_id)',
      'VALUES ($1, $2, $3)',
    ].join('\n'),
    [volunteerId, slotId, categoryId],
  )

  return { workshopId, slotId, categoryId, volunteerId }
}

async function cleanupFixture(fixture: Fixture): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  await mongoClient
    .db(mongoDatabaseName)
    .collection('reservation_attempts')
    .deleteMany({ workshopId: fixture.workshopId })
  await pool.query('DELETE FROM reservations WHERE slot_id = $1', [
    fixture.slotId,
  ])
  await pool.query('DELETE FROM workshops WHERE id = $1', [
    fixture.workshopId,
  ])
  await pool.query('DELETE FROM volunteers WHERE id = $1', [
    fixture.volunteerId,
  ])
}

function reservationPayload(fixture: Fixture, email: string) {
  return {
    slotId: fixture.slotId,
    categoryId: fixture.categoryId,
    firstName: 'Integration',
    lastName: 'Participant',
    email,
    itemName: 'Laptop',
    problemDescription: 'Does not start.',
  }
}

async function waitForAttemptCount(
  workshopId: number,
  expected: number,
): Promise<void> {
  const collection = mongoClient
    .db(mongoDatabaseName)
    .collection('reservation_attempts')

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const count = await collection.countDocuments({ workshopId })

    if (count >= expected) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error('Timed out waiting for MongoDB reservation attempts')
}

describe('API integration', () => {
  it('returns numeric availability counts from PostgreSQL', async () => {
    const fixture = await createFixture()

    try {
      const response = await request(app).get(
        '/api/workshops/' + fixture.workshopId + '/availability',
      )

      expect(response.status).toBe(200)
      const row = response.body.availability.find(
        (candidate: { slotId: string }) =>
          Number(candidate.slotId) === fixture.slotId,
      )

      expect(row).toMatchObject({
        categoryId: fixture.categoryId,
        volunteers: 1,
        capacity: 1,
        reserved: 0,
        remaining: 1,
      })
      expect(typeof row.capacity).toBe('number')
      expect(typeof row.remaining).toBe('number')
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('persists a reservation after a 201 response', async () => {
    const fixture = await createFixture()

    try {
      const response = await request(app)
        .post('/api/reservations')
        .send(reservationPayload(fixture, 'persisted@example.test'))

      expect(response.status).toBe(201)

      const stored = await pool.query(
        'SELECT id FROM reservations WHERE slot_id = $1 AND email = $2',
        [fixture.slotId, 'persisted@example.test'],
      )

      expect(stored.rowCount).toBe(1)
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('stores an SQL injection string literally and keeps the reservations table intact', async () => {
    const fixture = await createFixture()
    const lastName = "Robert'); DROP TABLE reservations;--"

    try {
      const response = await request(app)
        .post('/api/reservations')
        .send({
          ...reservationPayload(fixture, 'sql-injection@example.test'),
          lastName,
        })

      expect(response.status).toBe(201)

      const stored = await pool.query<{ lastName: string }>(
        'SELECT last_name AS "lastName" FROM reservations WHERE slot_id = $1',
        [fixture.slotId],
      )
      const table = await pool.query<{ name: string | null }>(
        "SELECT to_regclass('public.reservations')::text AS name",
      )

      expect(stored.rows[0].lastName).toBe(lastName)
      expect(table.rows[0].name).toBe('reservations')
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('returns 400 when slotId contains a SQL expression', async () => {
    const fixture = await createFixture()

    try {
      const response = await request(app)
        .post('/api/reservations')
        .send({
          ...reservationPayload(fixture, 'invalid-slot@example.test'),
          slotId: '1 OR 1=1',
        })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('validation_error')
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('allows exactly one of ten concurrent reservations for capacity one', async () => {
    const fixture = await createFixture()

    await pool.query(
      [
        'CREATE OR REPLACE FUNCTION test_delay_reservation_insert()',
        'RETURNS trigger',
        'LANGUAGE plpgsql',
        "AS 'BEGIN PERFORM pg_sleep(0.1); RETURN NEW; END';",
      ].join('\n'),
    )
    await pool.query(
      [
        'CREATE TRIGGER test_delay_reservation_insert_trigger',
        'BEFORE INSERT ON reservations',
        'FOR EACH ROW',
        'EXECUTE FUNCTION test_delay_reservation_insert()',
      ].join('\n'),
    )

    try {
      const responses = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          request(app)
            .post('/api/reservations')
            .send(
              reservationPayload(
                fixture,
                'concurrent-' + index + '@example.test',
              ),
            ),
        ),
      )

      const created = responses.filter((response) => response.status === 201)
      const full = responses.filter(
        (response) =>
          response.status === 409 &&
          response.body.code === 'capacity_full',
      )
      const stored = await pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM reservations WHERE slot_id = $1',
        [fixture.slotId],
      )

      expect(created).toHaveLength(1)
      expect(full).toHaveLength(9)
      expect(stored.rows[0].count).toBe('1')
    } finally {
      await pool.query(
        'DROP TRIGGER IF EXISTS test_delay_reservation_insert_trigger ON reservations',
      )
      await pool.query('DROP FUNCTION IF EXISTS test_delay_reservation_insert()')
      await cleanupFixture(fixture)
    }
  })

  it('returns booking_closed when the server-side closing time has passed', async () => {
    const fixture = await createFixture({ bookingClosed: true })

    try {
      const response = await request(app)
        .post('/api/reservations')
        .send(reservationPayload(fixture, 'closed@example.test'))

      expect(response.status).toBe(409)
      expect(response.body).toEqual({ code: 'booking_closed' })
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('only sends the CORS allow-origin header to the configured Front origin', async () => {
    const fixture = await createFixture()

    try {
      const evil = await request(app)
        .get('/api/workshops/' + fixture.workshopId + '/availability')
        .set('Origin', 'http://evil.example')
      const allowed = await request(app)
        .get('/api/workshops/' + fixture.workshopId + '/availability')
        .set('Origin', frontendOrigin)

      expect(evil.headers['access-control-allow-origin']).toBeUndefined()
      expect(allowed.headers['access-control-allow-origin']).toBe(
        frontendOrigin,
      )
    } finally {
      await cleanupFixture(fixture)
    }
  })

  it('returns 413 when the JSON request body exceeds 10 kilobytes', async () => {
    const response = await request(app)
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send(
        JSON.stringify({
          slotId: 1,
          categoryId: 1,
          firstName: 'A',
          lastName: 'B',
          email: 'large@example.test',
          itemName: 'Laptop',
          problemDescription: 'x'.repeat(11 * 1024),
        }),
      )

    expect(response.status).toBe(413)
  })

  it('returns invalid_json for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send('{"slotId":')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ code: 'invalid_json' })
  })

  it('protects admin stats and reports accepted, capacity, and validation outcomes', async () => {
    const fixture = await createFixture()

    try {
      const accepted = await request(app)
        .post('/api/reservations')
        .send(reservationPayload(fixture, 'stats-created@example.test'))
      const capacityFull = await request(app)
        .post('/api/reservations')
        .send(reservationPayload(fixture, 'stats-full@example.test'))
      const validationError = await request(app)
        .post('/api/reservations')
        .send({
          ...reservationPayload(fixture, 'not-an-email'),
          email: 'not-an-email',
        })

      expect(accepted.status).toBe(201)
      expect(capacityFull.status).toBe(409)
      expect(capacityFull.body.code).toBe('capacity_full')
      expect(validationError.status).toBe(400)

      await waitForAttemptCount(fixture.workshopId, 3)

      const missing = await request(app).get(
        '/api/admin/stats/reservation-attempts?workshopId=' +
          fixture.workshopId,
      )
      const wrong = await request(app)
        .get(
          '/api/admin/stats/reservation-attempts?workshopId=' +
            fixture.workshopId,
        )
        .set('Authorization', 'Bearer wrong-token')
      const correct = await request(app)
        .get(
          '/api/admin/stats/reservation-attempts?workshopId=' +
            fixture.workshopId,
        )
        .set('Authorization', 'Bearer ' + adminToken)

      expect(missing.status).toBe(401)
      expect(wrong.status).toBe(401)
      expect(correct.status).toBe(200)
      expect(correct.body).toEqual([
        { outcome: 'accepted', reason: 'created', count: 1 },
        { outcome: 'refused', reason: 'capacity_full', count: 1 },
        { outcome: 'refused', reason: 'validation_error', count: 1 },
      ])

      const documents = await mongoClient
        .db(mongoDatabaseName)
        .collection('reservation_attempts')
        .find({ workshopId: fixture.workshopId })
        .toArray()

      for (const document of documents) {
        expect(Object.keys(document).sort()).toEqual(
          [
            '_id',
            'categoryId',
            'createdAt',
            'outcome',
            'reason',
            'slotId',
            'workshopId',
          ].sort(),
        )
        expect(JSON.stringify(document)).not.toContain('@example.test')
        expect(JSON.stringify(document)).not.toContain('Participant')
      }
    } finally {
      await cleanupFixture(fixture)
    }
  })
})
