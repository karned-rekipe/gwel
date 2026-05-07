<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import { useDeleteRecipe, useGenerateRecipeImage } from '@/composables/useRecipeQueries'
import type { Recipe } from '@/types/recipe'

const props = defineProps<{
  recipe: Recipe
}>()

const router = useRouter()
const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipe()
const { mutate: generateRecipeImage, isPending: isGeneratingImage } = useGenerateRecipeImage()
const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

const recipeTags = computed(() => props.recipe.tags ?? [])
const recipeIngredients = computed(() => props.recipe.ingredients ?? [])
const recipeEquipment = computed(() => props.recipe.equipment ?? [])
const recipeSteps = computed(() => props.recipe.steps ?? [])
const recipeSources = computed(() => props.recipe.sources ?? [])
const recipeComponents = computed(() => props.recipe.components ?? [])

const totalTime = computed(() =>
  recipeSteps.value.reduce(
    (total, step) =>
      total + (step.total_time ?? (step.preparation_time ?? 0) + (step.cooking_time ?? 0) + (step.rest_time ?? 0)),
    0,
  ),
)

const totalTimeLabel = computed(() => {
  if (totalTime.value <= 0) return '—'
  const hours = Math.floor(totalTime.value / 60)
  const minutes = totalTime.value % 60
  return hours ? `${hours} h${minutes ? ` ${minutes}` : ''}` : `${minutes} min`
})

const seasonLabel = computed(() => {
  const bestMonths = Object.entries(props.recipe.season_months ?? {})
    .filter(([, score]) => Number(score) >= 2)
    .map(([month]) => monthNames[Number(month) - 1])
    .filter(Boolean)
  return bestMonths.length ? bestMonths.join(', ') : 'Toute saison'
})

const metaItems = computed(() => [
  { label: 'Origine', value: props.recipe.origin_country || '—' },
  { label: 'Pax', value: props.recipe.servings ? `${props.recipe.servings} pax` : '—' },
  { label: 'Difficulté', value: props.recipe.difficulty ? `${props.recipe.difficulty}/5` : '—' },
  { label: 'Prix', value: props.recipe.price ? `${props.recipe.price}/5` : '—' },
  { label: 'Temps', value: totalTimeLabel.value },
  { label: 'Saison', value: seasonLabel.value },
])

const handleBack = (): void => {
  router.push({ name: 'recipes-home' })
}

const handleEdit = (): void => {
  router.push({ name: 'recipes-edit', params: { id: props.recipe.uuid } })
}

const handleGenerateImage = (): void => {
  generateRecipeImage(props.recipe)
}

const handleDelete = (): void => {
  if (!window.confirm('Supprimer cette recette ?')) return
  deleteRecipe(props.recipe.uuid, {
    onSuccess: () => {
      router.push({ name: 'recipes-home' })
    },
  })
}
</script>

<template>
  <article class="recipe-detail">
    <header class="recipe-detail__header">
      <IconActionButton label="Retour" icon="←" @click="handleBack" />
      <div class="recipe-detail__header-actions">
        <IconActionButton
          label="Image IA"
          icon="▣"
          :disabled="isGeneratingImage"
          @click="handleGenerateImage"
        />
        <IconActionButton label="Modifier" icon="✎" @click="handleEdit" />
        <IconActionButton label="Supprimer" icon="×" variant="danger" :disabled="isDeleting" @click="handleDelete" />
      </div>
    </header>

    <section class="recipe-detail__hero">
      <div>
        <div class="recipe-detail__title-row">
          <h1 class="recipe-detail__title">{{ recipe.name }}</h1>
          <span v-if="recipe.favorite" class="recipe-detail__favorite">Favori</span>
        </div>
        <p v-if="recipe.description" class="recipe-detail__description">{{ recipe.description }}</p>
        <div class="recipe-detail__tags">
          <router-link v-for="tag in recipeTags" :key="tag.uuid" :to="{ name: 'tags-detail', params: { id: tag.uuid } }" class="recipe-detail__tag">
            {{ tag.name }}
          </router-link>
        </div>
      </div>
      <img v-if="recipe.main_image" :src="recipe.main_image" :alt="recipe.name" class="recipe-detail__image" />
    </section>

    <section class="recipe-detail__meta" aria-label="Métadonnées recette">
      <div v-for="item in metaItems" :key="item.label" class="recipe-detail__meta-item">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </section>

    <div class="recipe-detail__grid">
      <section class="recipe-detail__section">
        <h2>Ingrédients</h2>
        <ul class="recipe-detail__ingredients">
          <li v-for="ingredient in recipeIngredients" :key="ingredient.ingredient_uuid">
            <span class="recipe-detail__qty">{{ ingredient.quantity }}</span>
            <span class="recipe-detail__unit">{{ ingredient.unit }}</span>
            <router-link :to="{ name: 'ingredients-detail', params: { id: ingredient.ingredient_uuid } }">
              {{ ingredient.name }}
            </router-link>
          </li>
        </ul>
      </section>

      <section class="recipe-detail__section">
        <h2>Ustensiles</h2>
        <ul v-if="recipeEquipment.length" class="recipe-detail__equipment">
          <li v-for="equipment in recipeEquipment" :key="equipment.equipment_uuid">
            <span>{{ equipment.quantity ? `${equipment.quantity}x` : '1x' }}</span>
            <router-link :to="{ name: 'equipment-detail', params: { id: equipment.equipment_uuid } }">
              {{ equipment.name }}
            </router-link>
          </li>
        </ul>
        <p v-else class="recipe-detail__empty">Aucun ustensile renseigné.</p>
      </section>

      <section class="recipe-detail__section recipe-detail__section--wide">
        <h2>Préparation</h2>
        <ol class="recipe-detail__steps">
          <li v-for="(step, index) in recipeSteps" :key="step.uuid ?? `${step.name}-${index}`">
            <span class="recipe-detail__step-index">{{ index + 1 }}</span>
            <div>
              <h3>{{ step.name }}</h3>
              <p class="recipe-detail__step-time">
                Prépa {{ step.preparation_time ?? 0 }} min · Cuisson {{ step.cooking_time ?? 0 }} min · Repos {{ step.rest_time ?? 0 }} min
              </p>
              <p>{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section v-if="recipeComponents.length" class="recipe-detail__section recipe-detail__section--wide">
        <h2>Sous-recettes</h2>
        <div class="recipe-detail__components">
          <article
            v-for="component in recipeComponents"
            :key="component.uuid"
            class="recipe-detail__component"
          >
            <header class="recipe-detail__component-head">
              <h3>{{ component.label }}</h3>
              <span>x{{ component.servings_multiplier }}</span>
            </header>

            <div class="recipe-detail__component-grid">
              <div>
                <h4>Ingrédients</h4>
                <ul class="recipe-detail__ingredients recipe-detail__ingredients--compact">
                  <li v-for="ingredient in component.ingredients" :key="`${component.uuid}-${ingredient.ingredient_uuid}`">
                    <span class="recipe-detail__qty">{{ ingredient.quantity }}</span>
                    <span class="recipe-detail__unit">{{ ingredient.unit }}</span>
                    <router-link :to="{ name: 'ingredients-detail', params: { id: ingredient.ingredient_uuid } }">
                      {{ ingredient.name }}
                    </router-link>
                  </li>
                </ul>
              </div>

              <div>
                <h4>Étapes</h4>
                <ol class="recipe-detail__component-steps">
                  <li v-for="step in component.steps" :key="step.uuid ?? `${component.uuid}-${step.rank}`">
                    <strong>{{ step.rank }}. {{ step.name }}</strong>
                    <p v-if="step.description">{{ step.description }}</p>
                  </li>
                </ol>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="recipe-detail__source-box recipe-detail__section--wide">
        <h2>Source</h2>
        <ul v-if="recipeSources.length" class="recipe-detail__sources">
          <li v-for="source in recipeSources" :key="`${source.name}-${source.uri}`">
            <strong>{{ source.name }}</strong>
            <span v-if="source.description">{{ source.description }}</span>
            <a v-if="source.uri" :href="source.uri" target="_blank" rel="noreferrer">{{ source.uri }}</a>
          </li>
        </ul>
        <p v-else class="recipe-detail__empty">Aucune source renseignée.</p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.recipe-detail {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.recipe-detail__header,
.recipe-detail__title-row,
.recipe-detail__tags {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recipe-detail__header {
  justify-content: space-between;
  margin-bottom: 22px;
}

.recipe-detail__header-actions {
  display: flex;
  gap: 6px;
}

.recipe-detail__hero {
  display: grid;
  gap: 22px;
  align-items: start;
}

.recipe-detail__title-row {
  align-items: flex-start;
  justify-content: space-between;
}

.recipe-detail__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(2rem, 5vw, 4.2rem);
  line-height: 1;
  font-weight: 700;
}

.recipe-detail__favorite,
.recipe-detail__tag {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 0.8rem;
  font-weight: 650;
  padding: 5px 9px;
  white-space: nowrap;
}

.recipe-detail__description {
  max-width: 820px;
  margin: 14px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.recipe-detail__tags {
  flex-wrap: wrap;
  margin-top: 14px;
}

.recipe-detail__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.recipe-detail__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1px;
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-border);
}

.recipe-detail__meta-item {
  min-height: 70px;
  padding: 14px;
  background: var(--color-surface);
}

.recipe-detail__meta-item span {
  display: block;
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
  font-weight: 600;
}

.recipe-detail__meta-item strong {
  display: block;
  margin-top: 6px;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.recipe-detail__grid {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.recipe-detail__section,
.recipe-detail__source-box {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: 20px;
}

.recipe-detail__section h2,
.recipe-detail__source-box h2 {
  margin: 0 0 16px;
  font-size: 1.05rem;
}

.recipe-detail__ingredients,
.recipe-detail__equipment,
.recipe-detail__steps,
.recipe-detail__sources {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recipe-detail__ingredients li {
  display: grid;
  grid-template-columns: 72px 58px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  padding: 9px 0;
  border-bottom: 1px solid var(--color-border);
}

.recipe-detail__ingredients li:last-child,
.recipe-detail__equipment li:last-child,
.recipe-detail__steps li:last-child {
  border-bottom: 0;
}

.recipe-detail__qty {
  text-align: right;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.recipe-detail__unit {
  text-align: left;
  color: var(--color-text-secondary);
}

.recipe-detail__equipment li,
.recipe-detail__steps li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.recipe-detail__step-index {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-secondary);
  font-size: 0.85rem;
  font-weight: 700;
}

.recipe-detail__steps h3 {
  margin: 0;
  font-size: 1rem;
}

.recipe-detail__steps p {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.recipe-detail__step-time {
  color: var(--color-text-tertiary) !important;
  font-size: 0.85rem;
  font-weight: 600;
}

.recipe-detail__sources {
  display: grid;
  gap: 12px;
}

.recipe-detail__components {
  display: grid;
  gap: 14px;
}

.recipe-detail__component {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.recipe-detail__component-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.recipe-detail__component-head h3,
.recipe-detail__component-grid h4 {
  margin: 0;
}

.recipe-detail__component-head span {
  color: var(--color-text-secondary);
  font-weight: 650;
}

.recipe-detail__component-grid {
  display: grid;
  gap: 16px;
}

.recipe-detail__ingredients--compact li {
  grid-template-columns: 58px 48px minmax(0, 1fr);
}

.recipe-detail__component-steps {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-text-secondary);
}

.recipe-detail__component-steps li + li {
  margin-top: 10px;
}

.recipe-detail__component-steps p {
  margin: 4px 0 0;
}

.recipe-detail__sources li {
  display: grid;
  gap: 4px;
  color: var(--color-text-secondary);
}

.recipe-detail__empty {
  margin: 0;
  color: var(--color-text-tertiary);
}

@media (min-width: 940px) {
  .recipe-detail__hero {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  }

  .recipe-detail__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .recipe-detail__component-grid {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .recipe-detail__section--wide {
    grid-column: 1 / -1;
  }
}
</style>
