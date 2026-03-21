<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTimeFormatter } from '@/composables/useRecipe'
import type { Recipe } from '@/types/recipe'
import AppButton from '@/components/atoms/AppButton.vue'

const props = defineProps<{
  recipe: Recipe
}>()

const router = useRouter()
const { formatTime } = useTimeFormatter()

const totalTime = computed(() => (props.recipe.prepTime ?? 0) + (props.recipe.cookTime ?? 0))

const handleBack = (): void => {
  router.push({ name: 'home' })
}
</script>

<template>
  <article class="recipe-detail">
    <!-- Bouton retour -->
    <div class="recipe-detail__back">
      <AppButton variant="secondary" aria-label="Retour à la liste des recettes" @click="handleBack">
        ← Retour
      </AppButton>
    </div>

    <!-- En-tête avec image -->
    <header class="recipe-detail__header">
      <div v-if="recipe.imageUrl" class="recipe-detail__image-wrapper">
        <img :src="recipe.imageUrl" :alt="recipe.name" class="recipe-detail__image" />
      </div>
      <div v-else class="recipe-detail__image-placeholder">
        <span class="recipe-detail__image-icon">🍽️</span>
      </div>

      <div class="recipe-detail__header-content">
        <h1 class="recipe-detail__title">{{ recipe.name }}</h1>
        <p class="recipe-detail__description">{{ recipe.description }}</p>

        <!-- Métadonnées -->
        <div class="recipe-detail__meta">
          <div class="recipe-detail__meta-item">
            <span class="recipe-detail__meta-label">Préparation</span>
            <span class="recipe-detail__meta-value">{{ formatTime(recipe.prepTime ?? 0) }}</span>
          </div>
          <div class="recipe-detail__meta-item">
            <span class="recipe-detail__meta-label">Cuisson</span>
            <span class="recipe-detail__meta-value">{{ formatTime(recipe.cookTime ?? 0) }}</span>
          </div>
          <div class="recipe-detail__meta-item">
            <span class="recipe-detail__meta-label">Total</span>
            <span class="recipe-detail__meta-value">{{ formatTime(totalTime) }}</span>
          </div>
          <div class="recipe-detail__meta-item">
            <span class="recipe-detail__meta-label">Portions</span>
            <span class="recipe-detail__meta-value">{{ recipe.servings }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="recipe-detail__content">
      <!-- Ingrédients -->
      <section class="recipe-detail__section">
        <h2 class="recipe-detail__section-title">Ingrédients</h2>
        <ul class="recipe-detail__ingredients">
          <li v-for="ingredient in recipe.ingredients" :key="ingredient.uuid" class="recipe-detail__ingredient">
            <span class="recipe-detail__ingredient-quantity">
              {{ ingredient.unit }}
            </span>
            <span class="recipe-detail__ingredient-name">{{ ingredient.name }}</span>
          </li>
        </ul>
      </section>

      <!-- Ustensiles -->
      <section v-if="recipe.ustensils && recipe.ustensils.length > 0" class="recipe-detail__section">
        <h2 class="recipe-detail__section-title">Ustensiles nécessaires</h2>
        <ul class="recipe-detail__utensils">
          <li v-for="utensil in recipe.ustensils" :key="utensil.uuid" class="recipe-detail__utensil">
            🔧 {{ utensil.name }}
          </li>
        </ul>
      </section>

      <!-- Étapes -->
      <section class="recipe-detail__section recipe-detail__section--full">
        <h2 class="recipe-detail__section-title">Préparation</h2>
        <ol class="recipe-detail__steps">
          <li v-for="(step, index) in recipe.steps" :key="step.uuid" class="recipe-detail__step">
            <div class="recipe-detail__step-number">{{ step.order ?? index + 1 }}</div>
            <div class="recipe-detail__step-content">
              <h3 v-if="step.name" class="recipe-detail__step-title">{{ step.name }}</h3>
              <p class="recipe-detail__step-description">{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </article>
</template>

<style scoped>
.recipe-detail {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Bouton retour */
.recipe-detail__back {
  margin-bottom: 24px;
}

/* En-tête */
.recipe-detail__header {
  margin-bottom: 48px;
}

.recipe-detail__image-wrapper {
  width: 100%;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.recipe-detail__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recipe-detail__image-placeholder {
  width: 100%;
  height: 400px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin-bottom: 32px;
}

.recipe-detail__image-icon {
  font-size: 8rem;
  opacity: 0.9;
}

.recipe-detail__title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 16px 0;
  line-height: 1.2;
}

.recipe-detail__description {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #718096);
  line-height: 1.6;
  margin: 0 0 32px 0;
}

/* Métadonnées */
.recipe-detail__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 24px;
}

.recipe-detail__meta-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: var(--color-background-alt, #f7fafc);
  border-radius: 12px;
}

.recipe-detail__meta-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary, #718096);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.recipe-detail__meta-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
}

/* Contenu principal */
.recipe-detail__content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

.recipe-detail__section {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recipe-detail__section--full {
  grid-column: 1 / -1;
}

.recipe-detail__section-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 24px 0;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
}

/* Ingrédients */
.recipe-detail__ingredients {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-detail__ingredient {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--color-background-alt, #f7fafc);
  border-radius: 8px;
}

.recipe-detail__ingredient-quantity {
  font-weight: 600;
  color: var(--color-primary, #4a90e2);
  min-width: 80px;
}

.recipe-detail__ingredient-name {
  color: var(--color-text-primary, #2c3e50);
}

/* Ustensiles */
.recipe-detail__utensils {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.recipe-detail__utensil {
  padding: 12px 16px;
  background-color: var(--color-background-alt, #f7fafc);
  border-radius: 8px;
  color: var(--color-text-primary, #2c3e50);
}

/* Étapes */
.recipe-detail__steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.recipe-detail__step {
  display: flex;
  gap: 20px;
}

.recipe-detail__step-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary, #4a90e2);
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  border-radius: 50%;
}

.recipe-detail__step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-detail__step-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary, #2c3e50);
}

.recipe-detail__step-description {
  margin: 0;
  color: var(--color-text-primary, #2c3e50);
  line-height: 1.6;
}

/* Responsive */
@media (min-width: 768px) {
  .recipe-detail {
    padding: 40px;
  }

  .recipe-detail__content {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .recipe-detail {
    padding: 48px;
  }

  .recipe-detail__title {
    font-size: 3rem;
  }
}
</style>
