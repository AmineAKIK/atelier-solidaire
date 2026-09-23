<template>
  <button
    type="button"
    class="time-slot"
    :class="{
      selected,
      full: status === 'full',
    }"
    :disabled="status === 'full'"
    :aria-pressed="selected"
    @click="$emit('select')"
  >
    <strong>{{ time }}</strong>

    <span>
      {{ status === 'full' ? 'Complet' : selected ? 'Sélectionné' : 'Disponible' }}
    </span>

    <span v-if="selected" class="check" aria-hidden="true">✓</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  time: string
  status?: 'available' | 'full'
  selected?: boolean
}>()

defineEmits<{
  select: []
}>()
</script>

<style scoped>
.time-slot {
  width: 190px;
  min-height: 110px;
  padding: 20px 24px;

  position: relative;
  text-align: left;

  border: 1px solid #d1d5db;
  border-radius: 12px;

  background: white;
  color: #111827;
}

.time-slot strong,
.time-slot span {
  display: block;
}

.time-slot strong {
  margin-bottom: 8px;
  font-size: 20px;
  font-weight: 600;
}

.time-slot span {
  color: #4b5563;
  font-size: 14px;
}

.time-slot.selected {
  border: 2px solid #166534;
  background: #f0fdf4;
}

.time-slot.selected > span:not(.check) {
  color: #166534;
}

.time-slot.full {
  cursor: not-allowed;
  border-color: #e5e7eb;
  background: #f3f4f6;
}

.time-slot.full strong,
.time-slot.full span {
  color: #9ca3af;
}

.check {
  width: 24px;
  height: 24px;

  position: absolute;
  top: 16px;
  right: 16px;

  display: grid !important;
  place-items: center;

  border-radius: 50%;
  background: #166534;

  color: white !important;
  font-weight: 700;
}

@media (max-width: 768px) {
  .time-slot {
    width: 100%;
    min-height: 76px;
    padding: 13px 18px;
  }

  .time-slot strong {
    margin-bottom: 3px;
    font-size: 18px;
  }
}
</style>
