import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useReservationStore } from '../stores/reservation'

describe('reservation store', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('submits a numeric slotId after loading string identifiers from the API', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
    vi.stubEnv('VITE_WORKSHOP_ID', '2')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({
          reservation: {
            id: '42',
            publicToken: 'not-rendered',
            status: 'EXPECTED',
            createdAt: '2026-09-26T00:00:00.000Z',
          },
          capacity: {
            total: 2,
            reserved: 1,
            remaining: 1,
          },
        }),
      })

    vi.stubGlobal('fetch', fetchMock)
    setActivePinia(createPinia())

    const reservation = useReservationStore()

    await reservation.loadAvailability()
    reservation.selectSlot(4)

    reservation.participant.firstName = 'Amine'
    reservation.participant.lastName = 'Akik'
    reservation.participant.email = 'amine@example.test'
    reservation.participant.item = 'Ordinateur portable'
    reservation.participant.problem = 'Il ne démarre plus.'

    const submitted = await reservation.submitReservation()
    const requestInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    const payload = JSON.parse(String(requestInit.body)) as { slotId: unknown }

    expect(submitted).toBe(true)
    expect(payload.slotId).toBe(4)
    expect(typeof payload.slotId).toBe('number')
    expect(reservation.confirmation?.reservationId).toBe(42)
  })
})
