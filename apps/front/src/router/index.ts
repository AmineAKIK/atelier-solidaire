import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/atelier',
      name: 'workshop',
      component: () => import('../views/WorkshopView.vue'),
    },
    {
      path: '/reservation/heure',
      name: 'reservation-time',
      component: () => import('../views/TimeSelectionView.vue'),
    },
    {
      path: '/reservation/informations',
      name: 'reservation-participant',
      component: () => import('../views/ParticipantInfoView.vue'),
    },
    {
      path: '/reservation/verifier',
      name: 'reservation-review',
      component: () => import('../views/ReviewReservationView.vue'),
    },
    {
      path: '/reservation/confirmation',
      name: 'reservation-confirmation',
      component: () => import('../views/ConfirmationView.vue'),
    },
  ],
})

export default router
