<template>
  <article class="workshop-card">
    <p class="eyebrow">PROCHAIN ATELIER</p>

    <h3>samedi 12 septembre 2026</h3>

    <p class="meta">09:00 — 12:00</p>
    <p class="meta">Maison de quartier des Hauts-de-Saint-Aubin — Angers</p>

    <div class="categories">
      <p>Catégories proposées</p>

      <div class="tags">
        <span>Informatique</span>
        <span>Petit électroménager</span>
        <span>Couture &amp; textile</span>
      </div>
    </div>

    <AppButton to="/ateliers/12-septembre-2026"> Voir l'atelier </AppButton>
  </article>
</template>

<script setup lang="ts">
import AppButton from './ui/AppButton.vue'
</script>

<style scoped>
.workshop-card {
  width: min(900px, 100%);
  padding: 24px;

  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.eyebrow {
  margin: 0 0 20px;

  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.015em;
}

h3 {
  margin: 0 0 10px;

  font-size: 20px;
  font-weight: 600;
}

.meta {
  margin: 0 0 6px;

  color: var(--color-text-muted);
  font-size: 16px;
}

.categories {
  margin: 24px 0;
}

.categories p {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.tags span {
  min-height: 36px;
  padding: 0 22px;

  display: inline-flex;
  align-items: center;

  border-radius: var(--radius-lg);
  background: var(--color-surface-muted);

  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
}
</style>
