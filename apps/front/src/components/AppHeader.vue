<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">ATELIER SOLIDAIRE</RouterLink>

    <RouterLink to="/#prochain-atelier" class="nav-link">
      <span class="desktop-label">Prochains ateliers</span>
      <span class="mobile-label">Ateliers</span>
    </RouterLink>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.app-header {
  height: 80px;
  padding: 0 var(--content-padding);

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-bottom: 1px solid #d1d5db;
}

.brand {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
}

.nav-link {
  color: #111827;
  font-size: 14px;
  font-weight: 500;
}

.mobile-label {
  display: none;
}

@media (max-width: 768px) {
  .app-header {
    height: 64px;
  }

  .desktop-label {
    display: none;
  }

  .mobile-label {
    display: inline;
  }
}
</style>
