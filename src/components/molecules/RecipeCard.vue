<script setup lang="ts">
import { computed } from 'vue'
import type { Recipe } from '@/types/recipe'
import { countryFlagFrom } from '@/utils/countryFlags'

const props = defineProps<{
  recipe: Recipe
}>()

defineEmits<{
  click: [uuid: string]
}>()

const totalTime = computed(() =>
  props.recipe.steps.reduce((total, step) => {
    const stepTime =
      step.total_time ??
      (step.preparation_time ?? 0) + (step.cooking_time ?? 0) + (step.rest_time ?? 0)
    return total + stepTime
  }, 0),
)

const totalTimeLabel = computed(() => {
  if (totalTime.value <= 0) return null
  const hours = Math.floor(totalTime.value / 60)
  const minutes = totalTime.value % 60
  if (hours === 0) return `${minutes} min`
  return minutes > 0 ? `${hours} h ${minutes}` : `${hours} h`
})

const originFlag = computed(() => countryFlagFrom(props.recipe.origin_country))
</script>

<template>
  <article
    class="recipe-card"
    tabindex="0"
    :aria-label="`Voir la recette ${recipe.name}`"
    @click="$emit('click', recipe.uuid)"
    @keydown.enter="$emit('click', recipe.uuid)"
    @keydown.space.prevent="$emit('click', recipe.uuid)"
  >
    <div class="recipe-card__image-wrapper">
      <img
        v-if="recipe.main_image"
        :src="recipe.main_image"
        :alt="recipe.name"
        class="recipe-card__image"
        loading="lazy"
      />
      <div v-else class="recipe-card__image-placeholder" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="recipe-card__placeholder-icon">
          <path d="M10 36V20c0-5.523 4.477-10 10-10h8c5.523 0 10 4.477 10 10v16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M6 36h36" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M24 10v4M18 13l2 3M30 13l-2 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <span
        v-if="originFlag"
        class="recipe-card__badge recipe-card__badge--origin"
        :title="recipe.origin_country ?? 'Origine renseignée'"
      >
        {{ originFlag }}
      </span>
      <span v-if="recipe.favorite" class="recipe-card__badge recipe-card__badge--favorite" title="Recette favorite">
        ★
      </span>
    </div>

    <div class="recipe-card__body">
      <h3 class="recipe-card__title" :title="recipe.name">{{ recipe.name }}</h3>

      <div class="recipe-card__meta">
        <span v-for="tag in recipe.tags.slice(0, 2)" :key="tag.uuid" class="recipe-card__tag">
          {{ tag.name }}
        </span>
        <span v-if="recipe.origin_country" class="recipe-card__tag">{{ recipe.origin_country }}</span>
      </div>

      <div class="recipe-card__footer">
        <span v-if="totalTimeLabel" class="recipe-card__time">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="recipe-card__time-icon">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ totalTimeLabel }}
        </span>
        <span v-if="recipe.difficulty" class="recipe-card__difficulty" :aria-label="`Difficulté ${recipe.difficulty} sur 5`">
          {{ '●'.repeat(recipe.difficulty) }}<span class="recipe-card__difficulty-empty">{{ '○'.repeat(5 - recipe.difficulty) }}</span>
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.recipe-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-base);
}

.recipe-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.recipe-card:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.recipe-card__image-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--color-secondary);
  flex-shrink: 0;
}

.recipe-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.recipe-card:hover .recipe-card__image {
  transform: scale(1.04);
}

.recipe-card__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%);
}

.recipe-card__placeholder-icon {
  width: 42px;
  height: 42px;
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.recipe-card__badge {
  position: absolute;
  top: 8px;
  min-width: 28px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  color: var(--color-primary);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

.recipe-card__badge--origin {
  left: 8px;
}

.recipe-card__badge--favorite {
  right: 8px;
  color: #f5a623;
}

.recipe-card__body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px 12px 12px;
  flex: 1;
}

.recipe-card__title {
  margin: 0;
  min-height: calc(0.86rem * 1.24 * 2);
  color: var(--color-text-primary);
  font-size: 0.86rem;
  font-weight: 650;
  line-height: 1.24;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recipe-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 18px;
}

.recipe-card__tag {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.64rem;
  font-weight: 600;
  line-height: 1;
  padding: 3px 6px;
}

.recipe-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.recipe-card__time {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 550;
}

.recipe-card__time-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.recipe-card__difficulty {
  font-size: 0.56rem;
  color: var(--color-primary);
}

.recipe-card__difficulty-empty {
  color: var(--color-border-hover);
}
</style>
