<script setup lang="ts">
const props = defineProps<{
  name: string
}>()

defineEmits<{
  click: []
}>()

const initial = props.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'E'
</script>

<template>
  <article
    class="equipment-card"
    role="button"
    tabindex="0"
    :aria-label="`Voir ${name}`"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="equipment-card__visual">
      <span aria-hidden="true">{{ initial }}</span>
    </div>

    <div class="equipment-card__body">
      <h2>{{ name }}</h2>
    </div>
  </article>
</template>

<style scoped>
.equipment-card {
  min-width: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(58px, auto);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-base);
}

.equipment-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.equipment-card:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.equipment-card__visual {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 34%),
    linear-gradient(135deg, var(--color-surface-muted), color-mix(in srgb, var(--color-secondary) 70%, var(--color-surface)));
  color: var(--color-text-tertiary);
  font-size: clamp(2rem, 6vw, 3.4rem);
  font-weight: 800;
}

.equipment-card__body {
  display: grid;
  gap: 3px;
  padding: 10px 11px 11px;
}

.equipment-card__body h2 {
  overflow: hidden;
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.98rem;
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
