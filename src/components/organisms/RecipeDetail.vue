<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import type { Recipe } from '@/types/recipe'

const props = defineProps<{
  recipe: Recipe
}>()

const router = useRouter()

const headlineMetrics = computed(() => [
  { label: 'Portions', value: props.recipe.servings ?? '?' },
  { label: 'Ingrédients', value: props.recipe.ingredients.length },
  { label: 'Étapes', value: props.recipe.steps.length },
])

const handleBack = (): void => {
  router.push({ name: 'recipes-home' })
}
</script>

<template>
  <article class="recipe-detail">
    <div class="recipe-detail__back">
      <AppButton variant="secondary" @click="handleBack">Retour aux recettes</AppButton>
    </div>

    <header class="recipe-detail__hero">
      <div class="recipe-detail__hero-copy">
        <p class="recipe-detail__eyebrow">Fiche recette</p>
        <h1 class="recipe-detail__title">{{ recipe.name }}</h1>
        <p v-if="recipe.description" class="recipe-detail__description">{{ recipe.description }}</p>

        <div class="recipe-detail__metrics">
          <div
            v-for="metric in headlineMetrics"
            :key="metric.label"
            class="recipe-detail__metric"
          >
            <span class="recipe-detail__metric-label">{{ metric.label }}</span>
            <span class="recipe-detail__metric-value">{{ metric.value }}</span>
          </div>
        </div>
      </div>

      <div v-if="recipe.main_image" class="recipe-detail__hero-media">
        <img :src="recipe.main_image" :alt="recipe.name" class="recipe-detail__image" />
      </div>
      <div v-else class="recipe-detail__hero-media recipe-detail__hero-media--placeholder">
        <span class="recipe-detail__hero-emoji">🍽️</span>
      </div>
    </header>

    <div class="recipe-detail__grid">
      <section class="recipe-detail__section">
        <h2 class="recipe-detail__section-title">Ingrédients</h2>
        <ul class="recipe-detail__list">
          <li
            v-for="ingredient in recipe.ingredients"
            :key="`${ingredient.name}-${ingredient.unit}`"
            class="recipe-detail__list-item"
          >
            <div>
              <strong>{{ ingredient.quantity }} {{ ingredient.unit }}</strong>
              <span>{{ ingredient.name }}</span>
            </div>
            <small v-if="Object.keys(ingredient.season_months).length" class="recipe-detail__hint">
              Saison : {{ Object.keys(ingredient.season_months).join(', ') }}
            </small>
          </li>
        </ul>
      </section>

      <section v-if="recipe.equipment.length" class="recipe-detail__section">
        <h2 class="recipe-detail__section-title">Équipement</h2>
        <ul class="recipe-detail__list">
          <li
            v-for="equipment in recipe.equipment"
            :key="`${equipment.name}-${equipment.quantity ?? 'single'}`"
            class="recipe-detail__list-item"
          >
            <div>
              <strong v-if="equipment.quantity">{{ equipment.quantity }}x</strong>
              <span>{{ equipment.name }}</span>
            </div>
          </li>
        </ul>
      </section>

      <section class="recipe-detail__section recipe-detail__section--wide">
        <h2 class="recipe-detail__section-title">Préparation</h2>
        <ol class="recipe-detail__steps">
          <li
            v-for="(step, index) in recipe.steps"
            :key="step.uuid ?? `${step.name}-${index}`"
            class="recipe-detail__step"
          >
            <div class="recipe-detail__step-rank">{{ index + 1 }}</div>
            <div class="recipe-detail__step-body">
              <div class="recipe-detail__step-head">
                <h3 class="recipe-detail__step-title">{{ step.name }}</h3>
                <p class="recipe-detail__step-times">
                  Prépa {{ step.preparation_time ?? 0 }} min · Cuisson
                  {{ step.cooking_time ?? 0 }} min · Repos {{ step.rest_time ?? 0 }} min
                </p>
              </div>
              <p class="recipe-detail__step-description">{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section v-if="recipe.sources.length" class="recipe-detail__section recipe-detail__section--wide">
        <h2 class="recipe-detail__section-title">Sources</h2>
        <ul class="recipe-detail__sources">
          <li v-for="source in recipe.sources" :key="`${source.name}-${source.uri}`">
            <strong>{{ source.name }}</strong>
            <span v-if="source.description"> — {{ source.description }}</span>
            <a v-if="source.uri" :href="source.uri" target="_blank" rel="noreferrer">
              {{ source.uri }}
            </a>
          </li>
        </ul>
      </section>
    </div>
  </article>
</template>

<style scoped>
.recipe-detail {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 24px 56px;
}

.recipe-detail__back {
  margin-bottom: 18px;
}

.recipe-detail__hero {
  display: grid;
  gap: 22px;
  padding: 28px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 206, 98, 0.22), transparent 34%),
    linear-gradient(135deg, #fffaf1 0%, #ffffff 100%);
  border: 1px solid rgba(109, 78, 40, 0.08);
  box-shadow: 0 26px 48px rgba(81, 58, 19, 0.08);
}

.recipe-detail__eyebrow {
  margin: 0 0 8px;
  color: #8c5e15;
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.recipe-detail__title {
  margin: 0 0 10px;
  font-size: clamp(2.1rem, 4vw, 3.6rem);
  color: #2f2112;
  font-weight: 800;
}

.recipe-detail__description {
  margin: 0;
  color: #6f5737;
  line-height: 1.7;
}

.recipe-detail__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 20px;
}

.recipe-detail__metric {
  min-width: 120px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 244, 220, 0.9);
}

.recipe-detail__metric-label {
  display: block;
  color: #8c5e15;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.recipe-detail__metric-value {
  display: block;
  margin-top: 6px;
  color: #2f2112;
  font-size: 1.35rem;
  font-weight: 800;
}

.recipe-detail__hero-media {
  overflow: hidden;
  min-height: 280px;
  border-radius: 24px;
  background: #f7efe0;
}

.recipe-detail__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.recipe-detail__hero-media--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(255, 206, 98, 0.38), transparent 38%),
    linear-gradient(135deg, #f3d6a3 0%, #ebb26c 100%);
}

.recipe-detail__hero-emoji {
  font-size: 6rem;
}

.recipe-detail__grid {
  display: grid;
  gap: 18px;
  margin-top: 24px;
}

.recipe-detail__section {
  padding: 24px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(109, 78, 40, 0.08);
  box-shadow: 0 20px 38px rgba(81, 58, 19, 0.06);
}

.recipe-detail__section-title {
  margin: 0 0 18px;
  color: #2f2112;
  font-size: 1.4rem;
  font-weight: 800;
}

.recipe-detail__list,
.recipe-detail__sources,
.recipe-detail__steps {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recipe-detail__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-detail__list-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fff8ea;
  color: #5d4a2b;
}

.recipe-detail__list-item strong {
  margin-right: 6px;
  color: #2f2112;
}

.recipe-detail__hint {
  color: #8c5e15;
}

.recipe-detail__steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.recipe-detail__step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
}

.recipe-detail__step-rank {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb85e 0%, #ff8b4d 100%);
  color: #fffaf4;
  font-weight: 800;
}

.recipe-detail__step-body {
  padding: 16px;
  border-radius: 18px;
  background: #fff8ea;
}

.recipe-detail__step-title {
  margin: 0;
  color: #2f2112;
  font-size: 1.08rem;
  font-weight: 800;
}

.recipe-detail__step-times {
  margin: 6px 0 0;
  color: #8c5e15;
  font-size: 0.88rem;
  font-weight: 700;
}

.recipe-detail__step-description {
  margin: 12px 0 0;
  color: #5d4a2b;
  line-height: 1.65;
}

.recipe-detail__sources {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recipe-detail__sources li {
  color: #5d4a2b;
  line-height: 1.6;
}

@media (min-width: 960px) {
  .recipe-detail__hero {
    grid-template-columns: minmax(0, 1.2fr) 360px;
    align-items: stretch;
  }

  .recipe-detail__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .recipe-detail__section--wide {
    grid-column: 1 / -1;
  }
}
</style>
