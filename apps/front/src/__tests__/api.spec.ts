import { afterEach, describe, expect, it, vi } from 'vitest'

import { createReservation } from '../services/api'

describe('reservation API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('translates a capacity_full conflict into the expected French message', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({
        code: 'capacity_full',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createReservation({
        slotId: 1,
        categoryId: 1,
        firstName: 'Amine',
        lastName: 'Akik',
        email: 'amine@example.test',
        itemName: 'Ordinateur portable',
        problemDescription: 'Il ne démarre plus.',
      }),
    ).rejects.toMatchObject({
      code: 'capacity_full',
      message: "Cette heure vient d'être réservée. Choisissez une autre heure.",
    })

    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
