<template>
  <div class="page">
    <AppHeader />

    <main class="page-content reservation-page">
      <RouterLink to="/ateliers/12-septembre-2026" class="back-link">
        ← Retour à l'atelier
      </RouterLink>

      <h1>Choisissez votre heure d'arrivée</h1>

      <p class="workshop-name">Atelier du samedi 12 septembre 2026</p>

      <div class="category-selection">
        <span class="category-label">Catégorie sélectionnée</span>

        <div class="category-row">
          <span class="category-badge">
            {{ reservation.categoryLabel }}
          </span>

          <RouterLink to="/ateliers/12-septembre-2026" class="modify-link"> Modifier </RouterLink>
        </div>
      </div>

      <InfoCallout class="info">
        L'heure choisie correspond à votre arrivée et à votre première prise en charge. La durée de
        l'intervention peut varier selon le diagnostic et les bénévoles disponibles.
      </InfoCallout>

      <section class="slots-section">
        <h2>Heures disponibles</h2>

        <p class="intro">Choisissez l'heure à laquelle vous souhaitez arriver à l'atelier.</p>

        <div class="slots">
          <TimeSlotCard
            time="09:00"
            :selected="reservation.arrivalTime === '09:00'"
            @select="reservation.arrivalTime = '09:00'"
          />

          <TimeSlotCard
            time="10:00"
            :selected="reservation.arrivalTime === '10:00'"
            @select="reservation.arrivalTime = '10:00'"
          />

          <TimeSlotCard time="11:00" status="full" />
        </div>

        <AppButton to="/reservation/informations"> Continuer </AppButton>

        <p class="next-step">Prochaine étape : vos informations</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import InfoCallout from '../components/InfoCallout.vue'
import TimeSlotCard from '../components/TimeSlotCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useReservationStore } from '../stores/reservation'

const reservation = useReservationStore()
</script>

<style scoped>
.reservation-page {
  padding-top: 48px;
  padding-bottom: 96px;
}

.back-link {
  display: inline-block;
  margin-bottom: 22px;

  color: #4b5563;
  font-size: 14px;
}

h1 {
  margin: 0 0 8px;

  font-size: 28px;
  line-height: 36px;
}

.workshop-name {
  margin: 0;

  color: #4b5563;
  font-size: 16px;
}

.category-selection {
  margin-top: 16px;
}

.category-label {
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.category-row {
  margin-top: 8px;

  display: flex;
  align-items: center;
  gap: 16px;
}

.category-badge {
  padding: 5px 12px;

  border-radius: 6px;
  background: #f3f4f6;

  font-size: 14px;
  font-weight: 500;
}

.modify-link {
  color: #1d4ed8;
  font-size: 14px;
}

.info {
  margin-top: 28px;
}

.slots-section {
  margin-top: 48px;
}

h2 {
  margin: 0 0 8px;

  font-size: 20px;
  line-height: 28px;
}

.intro {
  margin: 0 0 24px;

  color: #4b5563;
  font-size: 16px;
}

.slots {
  margin-bottom: 32px;

  display: flex;
  gap: 24px;
}

.next-step {
  margin: 12px 0 0;

  color: #4b5563;
  font-size: 14px;
}

@media (max-width: 768px) {
  .reservation-page {
    padding-top: 32px;
  }

  h1 {
    font-size: 24px;
    line-height: 32px;
  }

  .slots {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
