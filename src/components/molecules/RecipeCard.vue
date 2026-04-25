<script setup lang="ts">
import { computed } from 'vue'
import type { Recipe } from '@/types/recipe'

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
  if (totalTime.value <= 0) {
    return '—'
  }

  const hours = Math.floor(totalTime.value / 60)
  const minutes = totalTime.value % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  return minutes > 0 ? `${hours} h ${minutes}` : `${hours} h`
})
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
    <div class="recipe-card__main">
      <h3 class="recipe-card__title">{{ recipe.name }}</h3>
      <div class="recipe-card__meta">
        <span v-if="recipe.origin_country">{{ recipe.origin_country }}</span>
        <span v-if="recipe.difficulty">D{{ recipe.difficulty }}</span>
        <span v-if="recipe.favorite">Favori</span>
        <span v-for="tag in recipe.tags.slice(0, 2)" :key="tag.uuid">{{ tag.name }}</span>
      </div>
    </div>
    <span class="recipe-card__time" :aria-label="`Temps total ${totalTimeLabel}`">
      {{ totalTimeLabel }}
    </span>
  </article>
</template>

<style scoped>
.recipe-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  min-height: 58px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    background var(--transition-base),
    transform var(--transition-base);
}

.recipe-card:hover {
  transform: translateY(-1px);
  border-color: var(--color-border-hover);
  background: var(--color-surface-muted);
}

.recipe-card__main {
  min-width: 0;
}

.recipe-card__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.22;
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recipe-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.recipe-card__meta span {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  padding: 4px 7px;
}

.recipe-card__time {
  white-space: nowrap;
  color: var(--color-text-tertiary);
  font-size: 0.82rem;
  font-weight: 550;
  line-height: 1.25;
}
</style>
