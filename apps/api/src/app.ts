import cors from 'cors'
import express from 'express'

import { pool } from './db/pool.js'
import { reservationsRouter } from './routes/reservations.js'
import { workshopsRouter } from './routes/workshops.js'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query<{
      database: string
      timezone: string
      now: Date
    }>(`
      SELECT
        current_database() AS database,
        current_setting('TIMEZONE') AS timezone,
        NOW() AS now
    `)

    res.json({
      status: 'ok',
      database: result.rows[0].database,
      timezone: result.rows[0].timezone,
      now: result.rows[0].now,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      status: 'error',
      code: 'database_unavailable',
    })
  }
})

app.use('/api/workshops', workshopsRouter)
app.use('/api/reservations', reservationsRouter)
