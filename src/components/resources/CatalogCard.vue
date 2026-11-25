<script setup lang="ts">
import { computed } from 'vue'
import { mediaCardImageUrl } from '@/utils/mediaUrls'

const props = defineProps<{
  name: string
  imageUrl?: string | null
  kind: 'ingredient' | 'equipment'
}>()

defineEmits<{
  click: []
}>()

const cardImageUrl = computed(() => mediaCardImageUrl(props.imageUrl))
const initial = computed(() => props.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || '•')
</script>

<template>
  <article
    class="catalog-card"
    role="button"
    tabindex="0"
    :aria-label="`Voir ${name}`"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="catalog-card__visual">
      <img v-if="cardImageUrl" :src="cardImageUrl" :alt="name" loading="lazy" decoding="async" />
      <span v-else-if="kind === 'ingredient'" class="catalog-card__initial" aria-hidden="true">{{ initial }}</span>
      <svg v-else viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 8v20M12 8v14a6 6 0 0 0 12 0V8M18 28v28" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M43 8c-5 0-9 7-9 16s4 15 9 15m0-31v48" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <div class="catalog-card__body">
      <h2 :title="name">{{ name }}</h2>
    </div>
  </article>
</template>

<style scoped>
.catalog-card {
  min-width: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(48px, auto);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-base);
}

.catalog-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.catalog-card:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.catalog-card__visual {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 35%),
    linear-gradient(135deg, var(--color-surface-muted), color-mix(in srgb, var(--color-secondary) 72%, var(--color-surface)));
  color: var(--color-text-tertiary);
}

.catalog-card__visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform var(--transition-base);
}

.catalog-card:hover .catalog-card__visual img { transform: scale(1.035); }

.catalog-card__visual svg {
  width: clamp(42px, 7vw, 64px);
  height: clamp(42px, 7vw, 64px);
  opacity: 0.45;
}

.catalog-card__initial {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 750;
  opacity: 0.62;
}

.catalog-card__body {
  display: grid;
  align-items: center;
  padding: 11px 12px 12px;
}

.catalog-card__body h2 {
  overflow: hidden;
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
