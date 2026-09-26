<template>
  <div class="page">
    <AppHeader />

    <main class="page-content home">
      <section class="hero">
        <h1>Réparez plutôt que jeter</h1>

        <p>
          Participez à un atelier solidaire et venez avec votre objet à diagnostiquer ou réparer
          avec l'aide de bénévoles.
        </p>

        <AppButton to="/atelier"> Voir le prochain atelier </AppButton>
      </section>

      <section id="prochain-atelier" class="next-workshop" :aria-busy="reservation.availabilityLoading">
        <h2>Prochain atelier</h2>

        <p v-if="reservation.availabilityLoading" class="api-state">
          Chargement du prochain atelier…
        </p>

        <div v-else-if="reservation.availabilityError" class="api-state" role="alert">
          <p>{{ reservation.availabilityError }}</p>
          <button type="button" class="retry-button" @click="retryAvailability">Réessayer</button>
        </div>

        <WorkshopCard
          v-else-if="reservation.workshop"
          :title="reservation.workshop.title"
          :date="reservation.workshopDate"
          :time-range="reservation.workshopTimeRange"
          :location="reservation.workshopLocation"
          :categories="reservation.workshopCategories"
        />
      </section>

      <section class="reservation-info">
        <h2>Comment fonctionne la réservation ?</h2>

        <InfoCallout>
          Vous réservez une heure d'arrivée pour une première prise en charge. La durée et la
          réussite de la réparation ne peuvent pas être garanties.
        </InfoCallout>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import AppHeader from '../components/AppHeader.vue'
import InfoCallout from '../components/InfoCallout.vue'
import WorkshopCard from '../components/WorkshopCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useReservationStore } from '../stores/reservation'

const reservation = useReservationStore()

onMounted(() => {
  void reservation.loadAvailability()
})

function retryAvailability() {
  void reservation.loadAvailability(true)
}
</script>

<style scoped>
.home {
  padding-top: 64px;
  padding-bottom: 96px;
}

.hero {
  max-width: 600px;
}

.hero h1 {
  margin: 0 0 20px;

  font-size: 40px;
  line-height: 48px;
}

.hero p {
  max-width: 550px;
  margin: 0 0 24px;

  color: var(--color-text-muted);
  font-size: 16px;
  line-height: 24px;
}

.next-workshop {
  margin-top: 64px;
}

.reservation-info {
  margin-top: 48px;
}

.api-state {
  max-width: 900px;
}

.api-state p {
  margin: 0 0 12px;
}

.retry-button {
  min-height: 42px;
  padding: 0 18px;

  border: 1px solid var(--color-border);
  border-radius: 8px;

  background: white;
  color: var(--color-text);
}

h2 {
  margin: 0 0 24px;

  font-size: 28px;
  line-height: 36px;
}

@media (max-width: 768px) {
  .home {
    padding-top: 40px;
  }

  .hero h1 {
    font-size: 32px;
    line-height: 40px;
  }

  .next-workshop {
    margin-top: 48px;
  }

  h2 {
    font-size: 24px;
    line-height: 32px;
  }
}
</style>
