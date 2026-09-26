<template>
  <button
    type="button"
    class="category-card"
    :class="{
      selected,
      dashed,
    }"
    :aria-pressed="selected"
    @click="$emit('select')"
  >
    <span v-if="selected" class="check" aria-hidden="true">✓</span>

    <strong>{{ title }}</strong>
    <span class="description">{{ description }}</span>

    <span v-if="badge" class="badge">
      {{ badge }}
    </span>
  </button>
</template>

<script setup lang="ts">
interface CategoryCardProps {
  /** Category name displayed to the participant. */
  title: string
  /** Short explanation of the objects covered by the category. */
  description: string
  /** Whether this category is currently selected. */
  selected?: boolean
  /** Whether the card uses the alternate dashed presentation. */
  dashed?: boolean
  /** Optional label used for special category handling. */
  badge?: string
}

withDefaults(defineProps<CategoryCardProps>(), {
  selected: false,
  dashed: false,
})

defineEmits<{
  select: []
}>()
</script>

<style scoped>
.category-card {
  min-height: 160px;
  padding: 22px;

  position: relative;
  text-align: left;

  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  background: white;
  color: var(--color-text);
}

.category-card:hover {
  border-color: #9ca3af;
}

.category-card:focus-visible {
  outline: 3px solid #86efac;
  outline-offset: 3px;
}

.category-card.selected {
  border: 2px solid var(--color-primary);
  background: var(--color-primary-soft);
}

.category-card.dashed {
  border-style: dashed;
}

strong,
.description {
  display: block;
}

strong {
  margin-bottom: 5px;

  font-size: 16px;
  font-weight: 600;
}

.description {
  color: var(--color-text-muted);
  font-size: 14px;
}

.check {
  width: 24px;
  height: 24px;

  position: absolute;
  top: 14px;
  right: 14px;

  display: grid;
  place-items: center;

  border-radius: 50%;
  background: var(--color-primary);
  color: white;

  font-size: 14px;
  font-weight: 700;
}

.badge {
  position: absolute;
  left: 15px;
  bottom: 16px;

  padding: 5px 8px;

  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);

  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}
</style>
