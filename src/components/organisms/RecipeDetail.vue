<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import RecipeAIProcessingOverlay from '@/components/organisms/RecipeAIProcessingOverlay.vue'
import { useRecipeAIProgress } from '@/composables/useRecipeAIProgress'
import { useEnrichRecipeWithAI, useGenerateRecipeImage } from '@/composables/useRecipeQueries'
import { aiRecipeService } from '@/services/aiRecipeService'
import { useRecipeWishlistStore } from '@/stores/recipeWishlistStore'
import type { Recipe, RecipeStep } from '@/types/recipe'
import { countryDisplayFrom } from '@/utils/countryFlags'
import {
  DEFAULT_RECIPE_ACCENT,
  extractAccentPalette,
  type RecipeAccentPalette,
} from '@/utils/imageAccent'

const props = withDefaults(defineProps<{
  recipe: Recipe
  embedded?: boolean
}>(), {
  embedded: false,
})

const emit = defineEmits<{
  back: []
  edit: []
}>()

const router = useRouter()
const { mutate: generateRecipeImage, isPending: isGeneratingImage } = useGenerateRecipeImage()
const { mutate: enrichRecipe, isPending: isEnriching } = useEnrichRecipeWithAI()
const wishlist = useRecipeWishlistStore()
const imageError = ref<string | null>(null)
const enrichmentError = ref<string | null>(null)
const enrichmentMessage = ref<string | null>(null)
const {
  isVisible: showEnrichmentOverlay,
  stage: enrichmentStage,
  completedStages: completedEnrichmentStages,
  start: startEnrichmentProgress,
  complete: completeEnrichmentProgress,
  fail: failEnrichmentProgress,
} = useRecipeAIProgress(() => aiRecipeService.getRunningRecipeEnrichment(props.recipe.uuid))
const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

const recipeTags = computed(() => props.recipe.tags ?? [])
const recipeIngredients = computed(() => props.recipe.ingredients ?? [])
const recipeEquipment = computed(() => props.recipe.equipment ?? [])
const recipeSteps = computed(() => props.recipe.steps ?? [])
const recipeSources = computed(() => props.recipe.sources ?? [])
const recipeComponents = computed(() => props.recipe.components ?? [])
const scoreSlots = [1, 2, 3, 4, 5]
const accentPalette = ref<RecipeAccentPalette>({ ...DEFAULT_RECIPE_ACCENT })
let accentRequest = 0
let enrichmentMessageTimer: number | undefined

const recipeAccentStyle = computed<Record<string, string>>(() => ({
  '--recipe-accent': accentPalette.value.accent,
  '--recipe-accent-vivid': accentPalette.value.vivid,
  '--recipe-accent-soft': accentPalette.value.soft,
}))

const recipeInitial = computed(() => props.recipe.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'R')

watch(
  () => props.recipe.main_image,
  async (imageUrl) => {
    const request = ++accentRequest
    const palette = await extractAccentPalette(imageUrl)
    if (request === accentRequest) accentPalette.value = palette
  },
  { immediate: true },
)

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

const dismissEnrichmentMessage = (): void => {
  if (enrichmentMessageTimer !== undefined) {
    window.clearTimeout(enrichmentMessageTimer)
    enrichmentMessageTimer = undefined
  }
  enrichmentMessage.value = null
}

const showEnrichmentMessage = (message: string): void => {
  dismissEnrichmentMessage()
  enrichmentMessage.value = message
  enrichmentMessageTimer = window.setTimeout(() => {
    enrichmentMessage.value = null
    enrichmentMessageTimer = undefined
  }, 5000)
}

onBeforeUnmount(() => {
  if (enrichmentMessageTimer !== undefined) window.clearTimeout(enrichmentMessageTimer)
})

const handleBack = (): void => {
  if (props.embedded) {
    emit('back')
    return
  }
  router.push({ name: 'recipes-home' })
}

const handleEdit = (): void => {
  if (props.embedded) {
    emit('edit')
    return
  }
  router.push({ name: 'recipes-edit', params: { id: props.recipe.uuid } })
}

const handleGenerateImage = (): void => {
  if (
    props.recipe.main_image
    && !window.confirm('Remplacer l’image actuelle par une nouvelle image générée par IA ?')
  ) return
  imageError.value = null
  generateRecipeImage(props.recipe, {
    onError: (err) => {
      imageError.value = err instanceof Error ? err.message : 'Génération de l’image impossible.'
    },
  })
}

const handleEnrich = (): void => {
  enrichmentError.value = null
  dismissEnrichmentMessage()
  startEnrichmentProgress()
  enrichRecipe(props.recipe.uuid, {
    onSuccess: (result) => {
      showEnrichmentMessage(result.warnings.length
        ? `Fiche mise à niveau. ${result.warnings.join(' ')}`
        : 'Fiche mise à niveau avec succès.')
      completeEnrichmentProgress()
    },
    onError: (err) => {
      failEnrichmentProgress()
      enrichmentError.value = err instanceof Error ? err.message : 'Mise à niveau impossible.'
    },
  })
}

const handleWishlistToggle = (): void => {
  wishlist.toggle(props.recipe.uuid)
}

</script>

<template>
  <RecipeAIProcessingOverlay
    v-if="showEnrichmentOverlay"
    :stage="enrichmentStage"
    :completed-stages="completedEnrichmentStages"
    mode="enrich"
    :subject="recipe.name"
  />

  <Teleport to="body">
    <Transition name="recipe-detail-toast">
      <div v-if="enrichmentMessage" class="recipe-detail__toast" role="status">
        <span class="recipe-detail__toast-icon" aria-hidden="true">✓</span>
        <span>{{ enrichmentMessage }}</span>
        <button
          type="button"
          class="recipe-detail__toast-close"
          aria-label="Fermer la confirmation"
          title="Fermer"
          @click="dismissEnrichmentMessage"
        >
          ×
        </button>
      </div>
    </Transition>
  </Teleport>

  <article class="recipe-detail" :style="recipeAccentStyle">
    <header v-if="!embedded" class="recipe-detail__toolbar">
      <div class="recipe-detail__toolbar-start">
        <IconActionButton label="Retour" icon="←" @click="handleBack" />
        <span class="recipe-detail__type">Fiche recette</span>
      </div>
    </header>

    <p v-if="enrichmentError" class="recipe-detail__feedback recipe-detail__feedback--error" role="alert">
      {{ enrichmentError }}
    </p>

    <section class="recipe-detail__hero">
      <div class="recipe-detail__intro">
        <div class="recipe-detail__title-row">
          <div>
            <h1 class="recipe-detail__title">{{ recipe.name }}</h1>
            <p v-if="recipe.subtitle" class="recipe-detail__subtitle">{{ recipe.subtitle }}</p>
          </div>
          <span v-if="recipe.favorite" class="recipe-detail__favorite" aria-label="Recette favorite" title="Recette favorite">
            ★
          </span>
        </div>
        <div class="recipe-detail__tags">
          <router-link v-for="tag in recipeTags" :key="tag.uuid" :to="{ name: 'tags-detail', params: { id: tag.uuid } }" class="recipe-detail__tag">
            {{ tag.name }}
          </router-link>
        </div>
        <p v-if="recipe.description" class="recipe-detail__description">{{ recipe.description }}</p>
        <div class="recipe-detail__header-actions">
          <button
            type="button"
            class="recipe-detail__wishlist-action"
            :class="{ 'recipe-detail__wishlist-action--active': isInWishlist }"
            :aria-pressed="isInWishlist"
            :title="isInWishlist ? 'Retirer de mes envies' : 'Ajouter à mes envies'"
            @click="handleWishlistToggle"
          >
            <span aria-hidden="true">{{ isInWishlist ? '♥' : '♡' }}</span>
            {{ isInWishlist ? 'Dans mes envies' : 'Envie' }}
          </button>
          <IconActionButton
            :label="isEnriching ? 'Mise à niveau en cours' : 'Compléter avec l’IA'"
            :icon="isEnriching ? '…' : '✦'"
            :disabled="isEnriching"
            show-label
            @click="handleEnrich"
          />
          <IconActionButton
            :label="isGeneratingImage ? 'Génération de l’image en cours' : 'Image IA'"
            :icon="isGeneratingImage ? '…' : '▣'"
            :disabled="isGeneratingImage"
            show-label
            @click="handleGenerateImage"
          />
          <IconActionButton label="Modifier" icon="✎" show-label @click="handleEdit" />
        </div>
      </div>

      <figure class="recipe-detail__media">
        <img v-if="recipe.main_image" :src="recipe.main_image" :alt="recipe.name" class="recipe-detail__image" />
        <div v-else class="recipe-detail__image recipe-detail__image--placeholder" aria-hidden="true">
          {{ recipeInitial }}
        </div>
        <span class="recipe-detail__accent-bubble recipe-detail__accent-bubble--large" aria-hidden="true"></span>
        <span class="recipe-detail__accent-bubble recipe-detail__accent-bubble--small" aria-hidden="true"></span>
      </figure>

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

    <p v-if="imageError" class="recipe-detail__error" role="alert">{{ imageError }}</p>

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

      <section class="recipe-detail__section recipe-detail__section--preparation recipe-detail__section--wide">
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
  --recipe-accent: #57534e;
  --recipe-accent-vivid: #91897f;
  --recipe-accent-soft: #f1efeb;
  max-width: 1480px;
  margin: 0 auto;
  padding: 30px 28px 56px;
}

.recipe-detail__toolbar,
.recipe-detail__toolbar-start,
.recipe-detail__title-row,
.recipe-detail__tags {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recipe-detail__toolbar {
  justify-content: space-between;
  margin-bottom: 30px;
}

.recipe-detail__toolbar-start {
  gap: 12px;
}

.recipe-detail__type {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  padding: 7px 13px;
  border: 1px solid color-mix(in srgb, var(--recipe-accent) 18%, var(--color-border));
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.recipe-detail__header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: auto;
  padding-top: 28px;
}

.recipe-detail__feedback {
  margin: -10px 0 18px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.recipe-detail__feedback--error {
  background: rgba(215, 0, 21, 0.08);
  border-color: rgba(215, 0, 21, 0.2);
  color: var(--color-danger);
}

.recipe-detail__wishlist-action {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 10px 18px;
  border: 1px solid var(--recipe-accent);
  border-radius: var(--radius-full);
  background: var(--recipe-accent);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--recipe-accent) 22%, transparent);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

.recipe-detail__wishlist-action:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--recipe-accent) 88%, #000);
  box-shadow: 0 13px 28px color-mix(in srgb, var(--recipe-accent) 28%, transparent);
}

.recipe-detail__wishlist-action span {
  color: inherit;
  font-size: 1rem;
}

.recipe-detail__header-actions :deep(.icon-action) {
  width: 44px;
  height: 44px;
  border-color: color-mix(in srgb, var(--recipe-accent) 22%, var(--color-border));
  border-radius: var(--radius-full);
  background: color-mix(in srgb, #fff 82%, transparent);
  color: var(--recipe-accent);
}

.recipe-detail__header-actions :deep(.icon-action--labeled) {
  width: auto;
  padding-inline: 11px;
  font-size: 0.84rem;
}

.recipe-detail__header-actions :deep(.icon-action:hover:not(:disabled)) {
  border-color: color-mix(in srgb, var(--recipe-accent) 50%, var(--color-border));
  background: var(--recipe-accent-soft);
}

.recipe-detail__hero {
  display: grid;
  gap: 34px;
  align-items: stretch;
}

.recipe-detail__intro {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-top: 18px;
}

.recipe-detail__title-row {
  align-items: flex-start;
  justify-content: space-between;
}

.recipe-detail__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(2.4rem, 4.5vw, 4.25rem);
  line-height: 0.94;
  font-weight: 760;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.recipe-detail__subtitle {
  margin: 6px 0 0;
  color: var(--recipe-accent);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2rem, 3.8vw, 3.75rem);
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.04em;
  line-height: 0.95;
  text-wrap: balance;
}

.recipe-detail__tag {
  border: 1px solid color-mix(in srgb, var(--recipe-accent) 14%, transparent);
  border-radius: var(--radius-full);
  background: var(--recipe-accent-soft);
  color: var(--recipe-accent);
  font-size: 0.76rem;
  font-weight: 650;
  padding: 6px 11px;
  white-space: nowrap;
}

.recipe-detail__favorite {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--recipe-accent) 22%, transparent);
  border-radius: var(--radius-full);
  background: var(--recipe-accent-soft);
  color: var(--recipe-accent);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.recipe-detail__description {
  max-width: 650px;
  margin: 24px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.98rem;
  line-height: 1.75;
}

.recipe-detail__error {
  margin: 18px 0 0;
  color: var(--color-danger);
  font-weight: 650;
}

.recipe-detail__tags {
  flex-wrap: wrap;
  margin-top: 20px;
}

.recipe-detail__media {
  position: relative;
  min-width: 0;
  margin: 0;
  padding: 0 10px;
}

.recipe-detail__image {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 16 / 9;
  display: block;
  object-fit: cover;
  border-radius: 34px 34px 26px 26px;
  border: 1px solid color-mix(in srgb, var(--recipe-accent) 16%, var(--color-border));
  box-shadow: 0 28px 60px color-mix(in srgb, var(--recipe-accent) 16%, rgba(0, 0, 0, 0.08));
}

.recipe-detail__image--placeholder {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 65% 28%, color-mix(in srgb, var(--recipe-accent-vivid) 38%, transparent), transparent 34%),
    var(--recipe-accent-soft);
  color: var(--recipe-accent);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(5rem, 12vw, 9rem);
  font-style: italic;
}

.recipe-detail__accent-bubble {
  position: absolute;
  z-index: 2;
  display: block;
  border-radius: 50%;
  background: var(--recipe-accent-vivid);
  box-shadow: inset -10px -8px 0 color-mix(in srgb, var(--recipe-accent) 36%, transparent);
}

.recipe-detail__accent-bubble--large {
  width: 54px;
  height: 54px;
  top: 18%;
  left: -3px;
}

.recipe-detail__accent-bubble--small {
  width: 30px;
  height: 30px;
  right: -2px;
  bottom: 15%;
}

.recipe-detail__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: 4px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--recipe-accent) 18%, var(--color-border));
  border-radius: 22px;
  background: color-mix(in srgb, var(--recipe-accent) 14%, var(--color-border));
}

.recipe-detail__meta-item {
  min-height: 88px;
  padding: 18px;
  background: color-mix(in srgb, var(--recipe-accent-soft) 62%, #fff);
}

.recipe-detail__meta-item span {
  display: block;
  color: var(--color-text-tertiary);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.recipe-detail__meta-item strong {
  display: block;
  margin-top: 8px;
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
  color: var(--recipe-accent);
}

.recipe-detail__score {
  gap: 6px;
  line-height: 1;
}

.recipe-detail__score--difficulty {
  color: var(--recipe-accent);
  font-size: 1.2rem !important;
}

.recipe-detail__score--price {
  color: var(--recipe-accent);
  font-size: 1.2rem !important;
  font-weight: 800;
}

.recipe-detail__score-symbol {
  display: inline-flex;
  line-height: 1;
  opacity: 1;
}

.recipe-detail__score-symbol.is-muted {
  color: var(--color-text-tertiary);
  filter: grayscale(1);
  opacity: 0.28;
}

.recipe-detail__grid {
  display: grid;
  gap: 18px;
  margin-top: 28px;
}

.recipe-detail__section {
  border: 1px solid color-mix(in srgb, var(--recipe-accent) 34%, var(--color-border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--recipe-accent-soft) 10%, var(--color-surface));
  padding: 24px;
  box-shadow: 0 12px 34px color-mix(in srgb, var(--recipe-accent) 7%, transparent);
}

.recipe-detail__section--preparation {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.recipe-detail__source-box {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 10px 4px 0;
}

.recipe-detail__section h2 {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 20px;
  color: var(--recipe-accent);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.recipe-detail__section h2::after {
  width: auto;
  height: 1px;
  flex: 1 1 auto;
  background: color-mix(in srgb, var(--recipe-accent) 30%, transparent);
  content: '';
}

.recipe-detail__source-box h2 {
  margin: 0 0 8px;
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
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
.recipe-detail__equipment li:last-child {
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

.recipe-detail__equipment li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.recipe-detail__steps {
  display: grid;
  gap: 0;
}

.recipe-detail__steps > li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 20px;
  padding: 26px 0;
}

.recipe-detail__steps > li + li {
  border-top: 1px solid color-mix(in srgb, var(--recipe-accent) 18%, var(--color-border));
}

.recipe-detail__step-index {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--recipe-accent);
  color: #fff;
  font-size: 0.98rem;
  font-weight: 800;
  box-shadow: 0 6px 14px color-mix(in srgb, var(--recipe-accent) 16%, transparent);
}

.recipe-detail__step-body {
  min-width: 0;
}

.recipe-detail__step-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: start;
}

.recipe-detail__steps h3 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 730;
  line-height: 1.4;
}

.recipe-detail__steps p {
  max-width: 74ch;
  margin: 10px 0 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
  line-height: 1.7;
}

.recipe-detail__step-times {
  display: grid;
  grid-template-columns: repeat(3, 76px);
  gap: 12px;
  justify-content: end;
}

.recipe-detail__step-time {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  justify-content: flex-start;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 2px 0;
  white-space: nowrap;
}

.recipe-detail__step-time-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--recipe-accent);
}

.recipe-detail__ingredients a,
.recipe-detail__equipment a,
.recipe-detail__sources a {
  color: var(--recipe-accent);
}

.recipe-detail__step-time-icon svg {
  width: 17px;
  height: 17px;
}

.recipe-detail__sources {
  display: grid;
  gap: 6px;
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
  gap: 2px;
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
  line-height: 1.55;
}

.recipe-detail__sources li strong {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
}

.recipe-detail__empty {
  margin: 0;
  color: var(--color-text-tertiary);
}

.recipe-detail__toast {
  position: fixed;
  z-index: 500;
  top: 16px;
  left: 50%;
  width: min(520px, calc(100vw - 28px));
  min-height: 50px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  background: rgba(29, 29, 31, 0.94);
  color: #ffffff;
  box-shadow: 0 18px 55px rgba(15, 23, 42, 0.28);
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.4;
  backdrop-filter: blur(16px) saturate(130%);
  transform: translateX(-50%);
}

.recipe-detail__toast-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.78rem;
}

.recipe-detail__toast-close {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.74);
  cursor: pointer;
  font: inherit;
  font-size: 1.1rem;
  line-height: 1;
}

.recipe-detail__toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.recipe-detail-toast-enter-active,
.recipe-detail-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.recipe-detail-toast-enter-from,
.recipe-detail-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

@media (min-width: 940px) {
  .recipe-detail__hero {
    grid-template-columns: minmax(0, 0.9fr) minmax(440px, 1.1fr);
    grid-template-areas:
      "intro media"
      "meta meta";
    column-gap: clamp(30px, 4vw, 58px);
    row-gap: 30px;
  }

  .recipe-detail__intro {
    grid-area: intro;
  }

  .recipe-detail__media {
    grid-area: media;
  }

  .recipe-detail__meta {
    grid-area: meta;
    grid-template-columns: repeat(6, minmax(0, 1fr));
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

  .recipe-detail__header-actions {
    justify-content: flex-start;
    margin-top: 28px;
    padding-top: 0;
  }

  .recipe-detail__hero {
    grid-template-areas:
      "intro"
      "media"
      "meta";
  }

  .recipe-detail__intro {
    grid-area: intro;
  }

  .recipe-detail__media {
    grid-area: media;
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

@media (max-width: 520px) {
  .recipe-detail {
    padding-top: 24px;
  }

  .recipe-detail__toolbar {
    margin-bottom: 18px;
  }

  .recipe-detail__intro {
    padding-top: 4px;
  }

  .recipe-detail__title {
    font-size: clamp(2.25rem, 11.5vw, 3.15rem);
  }

  .recipe-detail__subtitle {
    font-size: clamp(1.75rem, 9.5vw, 2.7rem);
  }

  .recipe-detail__media {
    padding-inline: 7px;
  }

  .recipe-detail__meta-item {
    min-height: 80px;
    padding: 14px;
  }

  .recipe-detail__step-times {
    grid-template-columns: minmax(0, 1fr);
  }

  .recipe-detail__section {
    padding: 18px;
  }

  .recipe-detail__steps > li {
    gap: 16px;
    padding-block: 24px;
  }
}
</style>
