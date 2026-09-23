import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import ParticipantInfoView from '../views/ParticipantInfoView.vue'
import ReviewReservationView from '../views/ReviewReservationView.vue'
import TimeSelectionView from '../views/TimeSelectionView.vue'
import WorkshopView from '../views/WorkshopView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/ateliers/12-septembre-2026',
      name: 'workshop',
      component: WorkshopView,
    },
    {
      path: '/reservation/heure',
      name: 'reservation-time',
      component: TimeSelectionView,
    },
    {
      path: '/reservation/informations',
      name: 'reservation-participant',
      component: ParticipantInfoView,
    },
    {
      path: '/reservation/verifier',
      name: 'reservation-review',
      component: ReviewReservationView,
    },
  ],
})

export default router
