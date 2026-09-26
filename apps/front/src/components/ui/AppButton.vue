<template>
  <RouterLink v-if="to && !disabled" :to="to" class="app-button" :class="`app-button--${variant}`">
    <slot />
  </RouterLink>

  <button
    v-else
    :type="type"
    :disabled="disabled"
    class="app-button"
    :class="`app-button--${variant}`"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface AppButtonProps {
  /** Optional route rendered as a RouterLink when the control is enabled. */
  to?: string
  /** Native button type used when the component renders a button. */
  type?: 'button' | 'submit'
  /** Visual variant applied to the control. */
  variant?: 'primary' | 'secondary'
  /** Whether navigation and button activation are disabled. */
  disabled?: boolean
}

withDefaults(defineProps<AppButtonProps>(), {
  type: 'button',
  variant: 'primary',
  disabled: false,
})

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.app-button {
  min-height: 48px;
  width: fit-content;
  padding: 0 26px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border-radius: 8px;

  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
}

.app-button--primary {
  border: 0;
  background: #166534;
  color: white;
}

.app-button--primary:hover:not(:disabled) {
  background: #14532d;
}

.app-button--secondary {
  border: 1px solid #d1d5db;
  background: white;
  color: #111827;
}

.app-button:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}

.app-button:disabled {
  cursor: not-allowed;
  background: #e5e7eb;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .app-button {
    width: 100%;
  }
}
</style>
