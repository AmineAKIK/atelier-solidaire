import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ReviewReservationView from '../views/ReviewReservationView.vue'
import { useReservationStore } from '../stores/reservation'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/reservation/informations', component: { template: '<div />' } },
      { path: '/reservation/verifier', component: { template: '<div />' } },
      { path: '/reservation/confirmation', component: { template: '<div />' } },
    ],
  })
}

describe('ReviewReservationView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('disables the confirmation button while the reservation is being sent', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')

    let resolveFetch: ((value: unknown) => void) | undefined
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const pinia = createPinia()
    const router = createTestRouter()

    await router.push('/reservation/verifier')
    await router.isReady()

    const reservation = useReservationStore(pinia)

    reservation.availabilityData = {
      workshop: {
        id: 2,
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
          slotId: 21,
          arrivalAt: '2026-10-10T07:00:00.000Z',
          localTime: '09:00',
          categoryId: 1,
          categoryCode: 'IT',
          categoryName: 'Informatique',
          volunteers: 1,
          capacity: 2,
          reserved: 0,
          remaining: 2,
        },
      ],
    }

    reservation.selectSlot(21)
    reservation.participant.firstName = 'Amine'
    reservation.participant.lastName = 'Akik'
    reservation.participant.email = 'amine@example.test'
    reservation.participant.item = 'Ordinateur portable'
    reservation.participant.problem = 'Il ne démarre plus.'

    const wrapper = mount(ReviewReservationView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const button = wrapper.get('button.app-button')

    await button.trigger('click')
    await nextTick()

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Envoi en cours')

    resolveFetch?.({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        reservation: {
          id: 42,
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

    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()

    wrapper.unmount()
  })
})
