import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { requireAdminToken } from '../../http/middleware/require-admin-token.js'

const token = '0123456789abcdef0123456789abcdef'

function createProtectedApp() {
  const app = express()

  app.get('/protected', requireAdminToken(token), (_request, response) => {
    response.json({ ok: true })
  })

  return app
}

describe('requireAdminToken', () => {
  it('returns 401 when the bearer token is missing', async () => {
    const response = await request(createProtectedApp()).get('/protected')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ code: 'unauthorized' })
  })

  it('returns 401 when the bearer token is incorrect', async () => {
    const response = await request(createProtectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer wrong-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ code: 'unauthorized' })
  })

  it('allows the request when the bearer token is correct', async () => {
    const response = await request(createProtectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer ' + token)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })
})
