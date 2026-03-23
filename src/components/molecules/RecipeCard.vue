<script setup lang="ts">
import type { Recipe } from '@/types/recipe'

const props = defineProps<{
  recipe: Recipe
}>()

defineEmits<{
  click: [uuid: string]
}>()
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
    <!-- Image de la recette -->
    <div class="recipe-card__image-wrapper">
      <div class="recipe-card__image-placeholder">
        <span class="recipe-card__image-icon">🍽️</span>
      </div>
    </div>

    <!-- Contenu de la carte -->
    <div class="recipe-card__content">
      <h3 class="recipe-card__title">{{ recipe.name }}</h3>
      <p v-if="recipe.description" class="recipe-card__description">{{ recipe.description }}</p>

      <!-- Nutriscore -->
      <div v-if="recipe.nutriscore" class="recipe-card__meta">
        <span class="recipe-card__meta-item">🥗 Nutriscore {{ recipe.nutriscore }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.recipe-card {
  /* Structure */
  display: flex;
  flex-direction: column;
  height: 100%;

  /* Apparence */
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  /* Interactivité */
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  /* Accessibilité : outline */
  outline: none;
}

.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.recipe-card:focus-visible {
  outline: 3px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
}

.recipe-card:active {
  transform: translateY(-2px);
}

/* Image */
.recipe-card__image-wrapper {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: var(--color-background-alt, #f7fafc);
}


.recipe-card__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.recipe-card__image-icon {
  font-size: 4rem;
  opacity: 0.9;
}

/* Contenu */
.recipe-card__content {
  /* Grille de spacing 8px */
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-grow: 1;
}

.recipe-card__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
  margin: 0;
  line-height: 1.4;

  /* Truncate après 2 lignes */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recipe-card__description {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #718096);
  margin: 0;
  line-height: 1.6;

  /* Truncate après 3 lignes */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Métadonnées */
.recipe-card__meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.recipe-card__meta-item {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #718096);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Responsive */
@media (max-width: 640px) {
  .recipe-card__image-wrapper {
    height: 160px;
  }

  .recipe-card__title {
    font-size: 1.125rem;
  }
}
</style>
