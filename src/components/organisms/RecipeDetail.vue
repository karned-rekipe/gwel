<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import { useDeleteRecipe, useGenerateRecipeImage } from '@/composables/useRecipeQueries'
import { useRecipeWishlistStore } from '@/stores/recipeWishlistStore'
import type { Recipe, RecipeStep } from '@/types/recipe'
import { countryDisplayFrom } from '@/utils/countryFlags'

const props = defineProps<{
  recipe: Recipe
}>()

const router = useRouter()
const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipe()
const { mutate: generateRecipeImage, isPending: isGeneratingImage } = useGenerateRecipeImage()
const wishlist = useRecipeWishlistStore()
const deleteError = ref<string | null>(null)
const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

const recipeTags = computed(() => props.recipe.tags ?? [])
const recipeIngredients = computed(() => props.recipe.ingredients ?? [])
const recipeEquipment = computed(() => props.recipe.equipment ?? [])
const recipeSteps = computed(() => props.recipe.steps ?? [])
const recipeSources = computed(() => props.recipe.sources ?? [])
const recipeComponents = computed(() => props.recipe.components ?? [])
const scoreSlots = [1, 2, 3, 4, 5]

const scoreFrom = (value?: number | null): number => {
  if (!value || !Number.isFinite(value)) return 0
  return Math.min(5, Math.max(1, Math.trunc(value)))
}

const formatDuration = (minutes?: number | null): string => {
  const value = Math.trunc(Number(minutes ?? 0))
  if (!Number.isFinite(value) || value <= 0) return '—'
  const hours = Math.floor(value / 60)
  const remainingMinutes = value % 60
  if (!hours) return `${remainingMinutes} min`
  return remainingMinutes ? `${hours} h ${remainingMinutes}` : `${hours} h`
}

const totalTime = computed(() =>
  recipeSteps.value.reduce(
    (total, step) =>
      total + (step.total_time ?? (step.preparation_time ?? 0) + (step.cooking_time ?? 0) + (step.rest_time ?? 0)),
    0,
  ),
)

const totalTimeLabel = computed(() => formatDuration(totalTime.value))
const originDisplay = computed(() => countryDisplayFrom(props.recipe.origin_country))
const difficultyScore = computed(() => scoreFrom(props.recipe.difficulty))
const priceScore = computed(() => scoreFrom(props.recipe.price))
const servingsLabel = computed(() => (props.recipe.servings ? String(props.recipe.servings) : '—'))
const isInWishlist = computed(() => wishlist.has(props.recipe.uuid))

const seasonLabel = computed(() => {
  const bestMonths = Object.entries(props.recipe.season_months ?? {})
    .filter(([, score]) => Number(score) >= 2)
    .map(([month]) => monthNames[Number(month) - 1])
    .filter(Boolean)
  return bestMonths.length ? bestMonths.join(', ') : 'Toute saison'
})

const stepTimeItems = (step: RecipeStep) => [
  { key: 'preparation', label: 'Préparation', value: formatDuration(step.preparation_time) },
  { key: 'cooking', label: 'Cuisson', value: formatDuration(step.cooking_time) },
  { key: 'rest', label: 'Repos', value: formatDuration(step.rest_time) },
]

const handleBack = (): void => {
  router.push({ name: 'recipes-home' })
}

const handleEdit = (): void => {
  router.push({ name: 'recipes-edit', params: { id: props.recipe.uuid } })
}

const handleGenerateImage = (): void => {
  generateRecipeImage(props.recipe)
}

const handleWishlistToggle = (): void => {
  wishlist.toggle(props.recipe.uuid)
}

const handleDelete = (): void => {
  if (!window.confirm('Supprimer cette recette ?')) return
  deleteError.value = null
  deleteRecipe(props.recipe.uuid, {
    onSuccess: () => {
      router.push({ name: 'recipes-home' })
    },
    onError: (err) => {
      deleteError.value = err.message || 'Suppression impossible.'
    },
  })
}
</script>

<template>
  <article class="recipe-detail">
    <header class="recipe-detail__header">
      <IconActionButton label="Retour" icon="←" @click="handleBack" />
      <div class="recipe-detail__header-actions">
        <button
          type="button"
          class="recipe-detail__wishlist-action"
          :class="{ 'recipe-detail__wishlist-action--active': isInWishlist }"
          @click="handleWishlistToggle"
        >
          <span aria-hidden="true">{{ isInWishlist ? '★' : '☆' }}</span>
          {{ isInWishlist ? 'Dans la liste d’envies' : 'Ajouter à la liste d’envies' }}
        </button>
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
      <div class="recipe-detail__intro">
        <div class="recipe-detail__title-row">
          <h1 class="recipe-detail__title">{{ recipe.name }}</h1>
          <span v-if="recipe.favorite" class="recipe-detail__favorite" aria-label="Recette favorite" title="Recette favorite">
            ★
          </span>
        </div>
        <p v-if="recipe.description" class="recipe-detail__description">{{ recipe.description }}</p>
        <div class="recipe-detail__tags">
          <router-link v-for="tag in recipeTags" :key="tag.uuid" :to="{ name: 'tags-detail', params: { id: tag.uuid } }" class="recipe-detail__tag">
            {{ tag.name }}
          </router-link>
        </div>
      </div>
      <img v-if="recipe.main_image" :src="recipe.main_image" :alt="recipe.name" class="recipe-detail__image" />

      <section class="recipe-detail__meta" aria-label="Métadonnées recette">
        <div class="recipe-detail__meta-item">
          <span>Origine</span>
          <strong class="recipe-detail__origin">
            <span v-if="originDisplay" aria-hidden="true" class="recipe-detail__origin-flag">{{ originDisplay.flag }}</span>
            {{ originDisplay?.name ?? '—' }}
          </strong>
        </div>
        <div class="recipe-detail__meta-item">
          <span>Personnes</span>
          <strong class="recipe-detail__people">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class="recipe-detail__metric-icon">
              <circle cx="8" cy="5.25" r="2.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M3.5 14c.65-2.65 2.15-4 4.5-4s3.85 1.35 4.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            {{ servingsLabel }}
          </strong>
        </div>
        <div class="recipe-detail__meta-item">
          <span>Difficulté</span>
          <strong
            class="recipe-detail__score recipe-detail__score--difficulty"
            :aria-label="difficultyScore ? `Difficulté ${difficultyScore} sur 5` : 'Difficulté non renseignée'"
          >
            <span
              v-for="index in scoreSlots"
              :key="`difficulty-${index}`"
              class="recipe-detail__score-symbol"
              :class="{ 'is-muted': index > difficultyScore }"
              aria-hidden="true"
            >
              👨‍🍳
            </span>
          </strong>
        </div>
        <div class="recipe-detail__meta-item">
          <span>Prix</span>
          <strong
            class="recipe-detail__score recipe-detail__score--price"
            :aria-label="priceScore ? `Prix ${priceScore} sur 5` : 'Prix non renseigné'"
          >
            <span
              v-for="index in scoreSlots"
              :key="`price-${index}`"
              class="recipe-detail__score-symbol"
              :class="{ 'is-muted': index > priceScore }"
              aria-hidden="true"
            >
              €
            </span>
          </strong>
        </div>
        <div class="recipe-detail__meta-item">
          <span>Temps total</span>
          <strong class="recipe-detail__time-total">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class="recipe-detail__metric-icon">
              <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ totalTimeLabel }}
          </strong>
        </div>
        <div class="recipe-detail__meta-item">
          <span>Saison</span>
          <strong>{{ seasonLabel }}</strong>
        </div>
      </section>
    </section>

    <p v-if="deleteError" class="recipe-detail__error">{{ deleteError }}</p>

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
            <div class="recipe-detail__step-body">
              <header class="recipe-detail__step-head">
                <h3>{{ step.name }}</h3>
                <div class="recipe-detail__step-times" aria-label="Temps de l'étape">
                  <span
                    v-for="time in stepTimeItems(step)"
                    :key="`${step.uuid ?? index}-${time.key}`"
                    class="recipe-detail__step-time"
                    :aria-label="`${time.label} ${time.value}`"
                    :title="time.label"
                  >
                    <span class="recipe-detail__step-time-icon" :class="`recipe-detail__step-time-icon--${time.key}`" aria-hidden="true">
                      <svg v-if="time.key === 'preparation'" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2v6.5a2 2 0 1 0 4 0V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M6 2v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M11.5 2v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M11.5 2c1.35 1.25 1.9 2.75 1.65 4.5-.17 1.2-.72 2.18-1.65 2.95" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                      <svg v-else-if="time.key === 'cooking'" viewBox="0 0 16 16" fill="none">
                        <path d="M8 14c2.4 0 4.25-1.6 4.25-3.95 0-1.72-.88-2.9-2.08-4.08-.58-.58-1-1.3-1.23-2.12C7.2 4.8 5.75 6.43 5.75 8.42c-.55-.38-.95-.88-1.2-1.52-.5.85-.8 1.8-.8 2.92C3.75 12.27 5.6 14 8 14Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                      </svg>
                      <svg v-else viewBox="0 0 16 16" fill="none">
                        <path d="M11.8 11.9A5.2 5.2 0 0 1 6.1 4.2 5.25 5.25 0 1 0 11.8 11.9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                      </svg>
                    </span>
                    <span>{{ time.value }}</span>
                  </span>
                </div>
              </header>
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
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.recipe-detail__wishlist-action {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 6px 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.recipe-detail__wishlist-action:hover {
  border-color: color-mix(in srgb, #f5a623 42%, var(--color-border));
  background: color-mix(in srgb, #f5a623 8%, var(--color-surface));
}

.recipe-detail__wishlist-action span,
.recipe-detail__wishlist-action--active {
  color: #f5a623;
}

.recipe-detail__hero {
  display: grid;
  gap: 22px;
  align-items: start;
}

.recipe-detail__intro {
  min-width: 0;
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

.recipe-detail__favorite {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  color: #f5a623;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.recipe-detail__description {
  max-width: 820px;
  margin: 14px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.recipe-detail__error {
  margin: 18px 0 0;
  color: var(--color-danger);
  font-weight: 650;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 18px;
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

.recipe-detail__origin,
.recipe-detail__people,
.recipe-detail__time-total,
.recipe-detail__score {
  display: flex !important;
  align-items: center;
  gap: 7px;
  min-height: 22px;
}

.recipe-detail__origin-flag {
  font-size: 1.15rem;
  line-height: 1;
}

.recipe-detail__metric-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  color: var(--color-primary);
}

.recipe-detail__score {
  gap: 4px;
  line-height: 1;
}

.recipe-detail__score--difficulty {
  color: var(--color-primary);
  font-size: 0.9rem !important;
}

.recipe-detail__score--price {
  color: var(--color-primary);
  font-weight: 800;
}

.recipe-detail__score-symbol {
  opacity: 1;
}

.recipe-detail__score-symbol.is-muted {
  color: var(--color-text-tertiary);
  filter: grayscale(1);
  opacity: 0.28;
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

.recipe-detail__step-body {
  min-width: 0;
}

.recipe-detail__step-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
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

.recipe-detail__step-times {
  display: grid;
  grid-template-columns: repeat(3, 82px);
  gap: 6px;
  justify-content: end;
}

.recipe-detail__step-time {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  justify-content: flex-start;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 4px 6px;
  white-space: nowrap;
}

.recipe-detail__step-time-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--color-primary);
}

.recipe-detail__step-time-icon svg {
  width: 15px;
  height: 15px;
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
    grid-template-areas:
      "intro image"
      "meta image";
  }

  .recipe-detail__intro {
    grid-area: intro;
  }

  .recipe-detail__image {
    grid-area: image;
  }

  .recipe-detail__meta {
    grid-area: meta;
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

@media (max-width: 760px) {
  .recipe-detail {
    padding-inline: 18px;
  }

  .recipe-detail__header {
    align-items: stretch;
    flex-direction: column;
  }

  .recipe-detail__header-actions {
    justify-content: flex-start;
  }

  .recipe-detail__hero {
    grid-template-areas:
      "intro"
      "image"
      "meta";
  }

  .recipe-detail__intro {
    grid-area: intro;
  }

  .recipe-detail__image {
    grid-area: image;
  }

  .recipe-detail__meta {
    grid-area: meta;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recipe-detail__step-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .recipe-detail__step-times {
    grid-template-columns: repeat(3, minmax(74px, 1fr));
    justify-content: stretch;
  }
}
</style>
