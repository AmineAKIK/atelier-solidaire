<template>
  <div class="page">
    <AppHeader />

    <main class="page-content reservation-page">
      <RouterLink to="/atelier" class="back-link"> ← Retour à l'atelier </RouterLink>

      <h1>Choisissez votre heure d'arrivée</h1>

      <p v-if="reservation.workshop" class="workshop-name">
        {{ reservation.workshop.title }} — {{ reservation.workshopDate }}
      </p>

      <div class="category-selection">
        <span class="category-label">Catégorie sélectionnée</span>

        <div class="category-row">
          <span class="category-badge">
            {{ reservation.categoryLabel }}
          </span>

          <RouterLink to="/atelier" class="modify-link"> Modifier </RouterLink>
        </div>
      </div>

      <InfoCallout class="info">
        L'heure choisie correspond à votre arrivée et à votre première prise en charge. La durée de
        l'intervention peut varier selon le diagnostic et les bénévoles disponibles.
      </InfoCallout>

      <section
        v-if="reservation.category === 'autre'"
        class="slots-section"
        role="alert"
      >
        <h2>Préqualification nécessaire</h2>
        <p>
          Votre demande doit d'abord être vérifiée par l'association avant qu'un créneau puisse
          être réservé.
        </p>
        <RouterLink to="/atelier" class="modify-link">Modifier la catégorie</RouterLink>
      </section>

      <section
        v-else
        class="slots-section"
        :aria-busy="reservation.availabilityLoading"
      >
        <h2>Heures disponibles</h2>

        <p class="intro">Choisissez l'heure à laquelle vous souhaitez arriver à l'atelier.</p>

        <p v-if="reservation.availabilityLoading">Chargement des créneaux…</p>

        <div v-else-if="reservation.availabilityError" class="error-state" role="alert">
          <p>{{ reservation.availabilityError }}</p>
          <button type="button" class="retry-button" @click="retryAvailability">Réessayer</button>
        </div>

        <template v-else>
          <div v-if="reservation.categorySlots.length" class="slots">
            <TimeSlotCard
              v-for="slot in reservation.categorySlots"
              :key="slot.slotId"
              :time="slot.localTime"
              :status="slot.remaining === 0 ? 'full' : 'available'"
              :selected="reservation.selectedSlotId === slot.slotId"
              @select="reservation.selectSlot(slot.slotId)"
            />
          </div>

          <p v-else class="empty-state">Aucun créneau n'est disponible pour cette catégorie.</p>

          <AppButton
            to="/reservation/informations"
            :disabled="!reservation.canContinueToParticipant"
          >
            Continuer
          </AppButton>

          <p class="next-step">Prochaine étape : vos informations</p>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import AppHeader from '../components/AppHeader.vue'
import InfoCallout from '../components/InfoCallout.vue'
import TimeSlotCard from '../components/TimeSlotCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useReservationStore } from '../stores/reservation'

const reservation = useReservationStore()

onMounted(() => {
  void reservation.loadAvailability(true)
})

function retryAvailability() {
  void reservation.loadAvailability(true)
}
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
  text-decoration: underline;
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
  flex-wrap: wrap;
  gap: 24px;
}

.error-state p {
  margin: 0 0 12px;
}

.retry-button {
  min-height: 42px;
  margin-bottom: 24px;
  padding: 0 18px;

  border: 1px solid #d1d5db;
  border-radius: 8px;

  background: white;
  color: #111827;
}

.empty-state {
  margin-bottom: 24px;
  color: #4b5563;
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
