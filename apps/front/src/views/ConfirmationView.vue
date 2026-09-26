<template>
  <div class="page">
    <AppHeader />

    <main class="page-content confirmation-page">
      <template v-if="reservation.confirmation">
        <h1>Réservation confirmée</h1>

        <p class="intro">
          Votre réservation a bien été enregistrée. Voici le récapitulatif de votre demande.
        </p>

        <section class="card">
          <h2>Atelier</h2>

          <p>
            <strong>Atelier</strong>
            {{ reservation.workshop?.title }}
          </p>
          <p>
            <strong>Date</strong>
            {{ reservation.workshopDate }}
          </p>
          <p>
            <strong>Horaire</strong>
            {{ reservation.arrivalTime }}
          </p>
          <p>
            <strong>Lieu</strong>
            {{ reservation.workshopLocation }}
          </p>
          <p>
            <strong>Catégorie</strong>
            {{ reservation.categoryLabel }}
          </p>
        </section>

        <section class="card">
          <h2>Votre demande</h2>

          <p>
            <strong>Participant</strong>
            {{ reservation.participant.firstName }} {{ reservation.participant.lastName }}
          </p>
          <p>
            <strong>Adresse e-mail</strong>
            {{ reservation.participant.email }}
          </p>
          <p>
            <strong>Objet</strong>
            {{ reservation.participant.item }}
          </p>
          <p>
            <strong>Problème signalé</strong>
            {{ reservation.participant.problem }}
          </p>
        </section>

        <AppButton to="/">Retour à l'accueil</AppButton>
      </template>

      <template v-else>
        <h1>Aucune réservation confirmée</h1>
        <p class="intro">Commencez par choisir un atelier et un créneau disponible.</p>
        <AppButton to="/atelier">Voir l'atelier</AppButton>
      </template>
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
.confirmation-page {
  max-width: 1060px;

  padding-top: 48px;
  padding-bottom: 96px;
}

h1 {
  margin: 0 0 8px;

  font-size: 28px;
}

.intro {
  max-width: 720px;
  color: #4b5563;
}

.card {
  max-width: 900px;
  margin: 24px 0;
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

@media (max-width: 768px) {
  .confirmation-page {
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
