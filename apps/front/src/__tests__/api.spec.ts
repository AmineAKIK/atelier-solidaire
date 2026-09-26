import { afterEach, describe, expect, it, vi } from 'vitest'

import { createReservation, getAvailability } from '../services/api'

describe('reservation API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('normalizes string identifiers returned by the availability endpoint', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        workshop: {
          id: '2',
          title: 'Atelier de démonstration Backend',
          startsAt: '2026-10-10T07:00:00.000Z',
          endsAt: '2026-10-10T10:00:00.000Z',
          bookingClosesAt: '2026-10-09T07:00:00.000Z',
          locationName: 'Maison de quartier des Hauts-de-Saint-Aubin',
          city: 'Angers',
          bookingOpen: true,
        },
        availability: [
          {
            slotId: '4',
            arrivalAt: '2026-10-10T07:00:00.000Z',
            localTime: '09:00',
            categoryId: '1',
            categoryCode: 'IT',
            categoryName: 'Informatique',
            volunteers: '1',
            capacity: '2',
            reserved: '0',
            remaining: '2',
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const response = await getAvailability(2)

    expect(response.availability[0]?.slotId).toBe(4)
    expect(typeof response.availability[0]?.slotId).toBe('number')
    expect(response.workshop.id).toBe(2)
    expect(response.availability[0]?.categoryId).toBe(1)
    expect(response.availability[0]?.volunteers).toBe(1)
    expect(response.availability[0]?.capacity).toBe(2)
    expect(response.availability[0]?.reserved).toBe(0)
    expect(response.availability[0]?.remaining).toBe(2)
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
