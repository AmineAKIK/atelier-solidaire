<template>
  <div class="page">
    <AppHeader />

    <main class="page-content workshop">
      <RouterLink to="/" class="back-link"> ← Retour aux ateliers </RouterLink>

      <h1>Atelier du samedi 12 septembre 2026</h1>

      <p class="meta">09:00 — 12:00</p>
      <p class="meta">Maison de quartier des Hauts-de-Saint-Aubin — Angers</p>

      <InfoCallout class="info">
        Vous réservez une heure d'arrivée pour une première prise en charge. La durée et la réussite
        de la réparation ne peuvent pas être garanties.
      </InfoCallout>

      <section class="category-section">
        <h2>Que souhaitez-vous faire réparer ?</h2>

        <p class="intro">Choisissez la catégorie qui correspond le mieux à votre objet.</p>

        <div class="category-grid">
          <CategoryCard
            title="Informatique"
            description="Ordinateurs et périphériques"
            :selected="reservation.category === 'informatique'"
            @select="reservation.category = 'informatique'"
          />

          <CategoryCard
            title="Petit électroménager"
            description="Petit appareil électrique domestique"
            :selected="reservation.category === 'electromenager'"
            @select="reservation.category = 'electromenager'"
          />

          <CategoryCard
            title="Couture & textile"
            description="Vêtement ou article textile"
            :selected="reservation.category === 'couture'"
            @select="reservation.category = 'couture'"
          />

          <CategoryCard
            title="Je ne sais pas / autre"
            description="Votre demande sera d'abord vérifiée par l'association."
            badge="Préqualification"
            dashed
            :selected="reservation.category === 'autre'"
            @select="reservation.category = 'autre'"
          />
        </div>

        <AppButton @click="continueToSlots"> Voir les heures disponibles </AppButton>

        <p class="selection-status" aria-live="polite">
          Catégorie sélectionnée : {{ reservation.categoryLabel }}
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import AppHeader from '../components/AppHeader.vue'
import CategoryCard from '../components/CategoryCard.vue'
import InfoCallout from '../components/InfoCallout.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useReservationStore } from '../stores/reservation'

const router = useRouter()
const reservation = useReservationStore()

function continueToSlots() {
  router.push('/reservation/heure')
}
</script>

<style scoped>
.workshop {
  padding-top: 48px;
  padding-bottom: 96px;
}

.back-link {
  display: inline-block;
  margin-bottom: 22px;

  color: var(--color-text-muted);
  font-size: 14px;
}

h1 {
  margin: 0 0 8px;

  font-size: 28px;
  line-height: 36px;
}

.meta {
  margin: 0 0 6px;

  color: var(--color-text-muted);
  font-size: 16px;
}

.info {
  margin-top: 30px;
}

.category-section {
  margin-top: 48px;
}

h2 {
  margin: 0 0 6px;

  font-size: 28px;
  line-height: 36px;
}

.intro {
  margin: 0 0 20px;

  color: var(--color-text-muted);
  font-size: 16px;
}

.category-grid {
  max-width: 1212px;
  margin-bottom: 32px;

  display: grid;
  grid-template-columns: repeat(4, minmax(0, 285px));
  gap: 24px;
}

.selection-status {
  margin-top: 16px;

  color: var(--color-text-muted);
  font-size: 14px;
}

@media (max-width: 1050px) {
  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .workshop {
    padding-top: 32px;
  }

  h1,
  h2 {
    font-size: 24px;
    line-height: 32px;
  }

  .category-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
