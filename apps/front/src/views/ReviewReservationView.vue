<template>
  <div class="page">
    <AppHeader />

    <main class="page-content review-page">
      <RouterLink to="/reservation/informations" class="back-link">
        ← Retour à vos informations
      </RouterLink>

      <h1>Vérifier votre réservation</h1>

      <p class="intro">
        Vérifiez les informations ci-dessous avant de confirmer votre réservation.
      </p>

      <section class="card">
        <h2>Atelier</h2>

        <p><strong>Date</strong> samedi 12 septembre 2026</p>
        <p>
          <strong>Heure d'arrivée</strong>
          {{ reservation.arrivalTime }}
        </p>
        <p>
          <strong>Catégorie</strong>
          {{ reservation.categoryLabel }}
        </p>
      </section>

      <section class="card">
        <h2>Vos informations</h2>

        <p>
          <strong>Prénom</strong>
          {{ reservation.participant.firstName }}
        </p>

        <p>
          <strong>Nom</strong>
          {{ reservation.participant.lastName }}
        </p>

        <p>
          <strong>Adresse e-mail</strong>
          {{ reservation.participant.email }}
        </p>
      </section>

      <section class="card">
        <h2>Objet et problème signalé</h2>

        <p>
          <strong>Objet</strong>
          {{ reservation.participant.item }}
        </p>

        <p>
          <strong>Description</strong>
          {{ reservation.participant.problem }}
        </p>
      </section>

      <p class="backend-note">
        La confirmation réelle sera activée après connexion à l'API Backend.
      </p>

      <AppButton disabled> Confirmer ma réservation </AppButton>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useReservationStore } from '../stores/reservation'

const reservation = useReservationStore()
</script>

<style scoped>
.review-page {
  max-width: 1060px;

  padding-top: 48px;
  padding-bottom: 96px;
}

.back-link {
  color: #4b5563;
  font-size: 14px;
}

h1 {
  margin: 22px 0 8px;

  font-size: 28px;
}

.intro {
  color: #4b5563;
}

.card {
  max-width: 900px;
  margin-top: 24px;
  padding: 24px;

  border: 1px solid #d1d5db;
  border-radius: 12px;
}

.card h2 {
  margin: 0 0 20px;

  font-size: 20px;
}

.card p {
  display: grid;
  grid-template-columns: 180px 1fr;

  margin: 8px 0;

  font-size: 14px;
}

.card p strong {
  color: #4b5563;
  font-weight: 400;
}

.backend-note {
  max-width: 900px;
  margin: 24px 0 16px;

  color: #4b5563;
  font-size: 14px;
}

@media (max-width: 768px) {
  .review-page {
    padding-top: 32px;
  }

  h1 {
    font-size: 24px;
  }

  .card p {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}
</style>
