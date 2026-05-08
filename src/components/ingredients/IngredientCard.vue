<script setup lang="ts">
const props = defineProps<{
  name: string
  imageUrl?: string | null
  hasAlert?: boolean
  alertLabel?: string
  statusLabel?: string
}>()

defineEmits<{
  click: []
}>()

const initial = props.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'I'
</script>

<template>
  <article
    class="ingredient-card"
    role="button"
    tabindex="0"
    :aria-label="`Voir ${name}`"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="ingredient-card__visual">
      <img v-if="imageUrl" :src="imageUrl" :alt="name" loading="lazy" />
      <span v-else aria-hidden="true">{{ initial }}</span>
      <strong
        v-if="hasAlert"
        class="ingredient-card__alert"
        :title="alertLabel"
        :aria-label="alertLabel"
      >
        !
      </strong>
    </div>

    <div class="ingredient-card__body">
      <h2>{{ name }}</h2>
      <p v-if="statusLabel">{{ statusLabel }}</p>
    </div>
  </article>
</template>

<style scoped>
.ingredient-card {
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

.ingredient-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.ingredient-card:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.ingredient-card__visual {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-success) 18%, transparent), transparent 34%),
    linear-gradient(135deg, var(--color-surface-muted), color-mix(in srgb, var(--color-primary) 7%, var(--color-surface)));
  color: var(--color-text-tertiary);
  font-size: clamp(2rem, 6vw, 3.4rem);
  font-weight: 800;
}

.ingredient-card__visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.ingredient-card__alert {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-surface);
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: white;
  font-size: 0.86rem;
  line-height: 1;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
}

.ingredient-card__body {
  display: grid;
  gap: 3px;
  padding: 10px 11px 11px;
}

.ingredient-card__body h2 {
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

.ingredient-card__body p {
  overflow: hidden;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
