<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { recipeService } from '@/services/recipeService'
import type { MealItem, SlotCode } from '@/types/mealPlan'
import type { Recipe } from '@/types/recipe'

const recipeCache = new Map<string, Recipe | null>()
const recipeRequests = new Map<string, Promise<Recipe | null>>()

const loadRecipe = async (uuid: string): Promise<Recipe | null> => {
  if (recipeCache.has(uuid)) return recipeCache.get(uuid) ?? null
  const existingRequest = recipeRequests.get(uuid)
  if (existingRequest) return existingRequest

  const request = recipeService.getByUuid(uuid)
    .then((recipe) => {
      recipeCache.set(uuid, recipe)
      return recipe
    })
    .catch(() => {
      recipeCache.set(uuid, null)
      return null
    })
    .finally(() => {
      recipeRequests.delete(uuid)
    })

  recipeRequests.set(uuid, request)
  return request
}

const props = defineProps<{
  item: MealItem
  fallbackHeadcount?: number | null
  slotDate: string
  slotCode: SlotCode
  readonly?: boolean
}>()

const isPreviewOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const fullRecipe = ref<Recipe | null>(null)
const thumbnailUri = ref<string | null>(null)

const effectiveHeadcount = computed(() => props.item.headcount ?? props.fallbackHeadcount ?? null)
const itemUsesPax = computed(() => props.item.item_type === 'recipe' || props.item.item_type === 'ingredient')
const isRecipe = computed(() => props.item.item_type === 'recipe' && !!props.item.recipe_uuid)
const avatarDots = computed(() => Array.from({ length: Math.min(effectiveHeadcount.value ?? 0, 4) }, (_, index) => index))
const remainingAvatars = computed(() => Math.max((effectiveHeadcount.value ?? 0) - avatarDots.value.length, 0))

const title = computed(() => {
  if (props.item.item_type === 'recipe') return props.item.recipe_snapshot?.title || 'Recette'
  if (props.item.item_type === 'ingredient') return props.item.ingredient_name || 'Ingrédient'
  if (props.item.item_type === 'prep_task') return 'Préparation'
  if (props.item.item_type === 'mixed') return 'Ancien système'
  return 'Note'
})

const thumbnailInitial = computed(() => title.value.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'R')

const detail = computed(() => {
  if (props.item.item_type === 'ingredient') {
    const quantity = props.item.ingredient_quantity ?? 0
    const unit = props.item.ingredient_unit ?? ''
    return effectiveHeadcount.value ? `${quantity} ${unit} / pax` : `${quantity} ${unit}`
  }
  if (props.item.note) return props.item.note
  if (props.item.recipe_snapshot?.total_duration_min) return `${props.item.recipe_snapshot.total_duration_min} min`
  return ''
})

const recipeServings = computed(() => (
  fullRecipe.value?.servings
  ?? props.item.recipe_snapshot?.servings_default
  ?? 1
))

const previewHeadcount = computed(() => effectiveHeadcount.value ?? recipeServings.value)

const durationBreakdown = computed(() => {
  const steps = fullRecipe.value?.steps ?? []
  const preparation = steps.reduce((total, step) => total + (step.preparation_time ?? 0), 0)
  const cooking = steps.reduce((total, step) => total + (step.cooking_time ?? 0), 0)
  const rest = steps.reduce((total, step) => total + (step.rest_time ?? 0), 0)
  const totalFromSteps = preparation + cooking + rest
  const total = totalFromSteps || props.item.recipe_snapshot?.total_duration_min || null
  return { preparation, cooking, rest, total }
})

const previewIngredients = computed(() => {
  if (fullRecipe.value?.ingredients?.length) {
    return fullRecipe.value.ingredients.map((ingredient) => ({
      ingredient_uuid: ingredient.ingredient_uuid,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    }))
  }
  return (props.item.recipe_snapshot?.ingredients ?? []).map((ingredient) => ({
    ingredient_uuid: ingredient.ingredient_uuid,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
  }))
})

const scaleFactor = computed(() => {
  const servings = recipeServings.value || 1
  return previewHeadcount.value / servings
})

const formatQuantity = (quantity: number): string => {
  const scaled = quantity * scaleFactor.value
  return Number.isInteger(scaled) ? String(scaled) : String(Number(scaled.toFixed(2)))
}

const openRecipePreview = async (): Promise<void> => {
  if (!props.item.recipe_uuid) return
  isPreviewOpen.value = true
  previewError.value = null
  fullRecipe.value = recipeCache.get(props.item.recipe_uuid) ?? null
  if (fullRecipe.value) return
  previewLoading.value = true
  try {
    fullRecipe.value = await loadRecipe(props.item.recipe_uuid)
    if (!fullRecipe.value) {
      previewError.value = 'Fiche recette indisponible.'
    }
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : 'Fiche recette indisponible.'
  } finally {
    previewLoading.value = false
  }
}

const closeRecipePreview = (): void => {
  isPreviewOpen.value = false
}

watch(() => props.item.recipe_uuid, async (uuid) => {
  thumbnailUri.value = null
  if (!uuid) return
  const recipe = await loadRecipe(uuid)
  if (props.item.recipe_uuid === uuid) {
    thumbnailUri.value = recipe?.main_image ?? null
    fullRecipe.value = fullRecipe.value ?? recipe
  }
}, { immediate: true })
</script>

<template>
  <article
    class="meal-item"
    :class="{ 'meal-item--clickable': isRecipe }"
    :role="isRecipe ? 'button' : undefined"
    :tabindex="isRecipe ? 0 : undefined"
    @click="isRecipe && openRecipePreview()"
    @keydown.enter="isRecipe && openRecipePreview()"
  >
    <div class="meal-item__thumbnail" aria-hidden="true">
      <img v-if="thumbnailUri" :src="thumbnailUri" :alt="title" />
      <span v-else>{{ thumbnailInitial }}</span>
    </div>

    <div class="meal-item__body">
      <strong>{{ title }}</strong>
      <span v-if="detail">{{ detail }}</span>
    </div>

    <div v-if="itemUsesPax" class="meal-item__participants" :aria-label="`${effectiveHeadcount ?? '?'} personnes`">
      <span class="meal-item__pax">
        <span aria-hidden="true">👤</span>
        {{ effectiveHeadcount ?? '?' }}
      </span>
      <span v-if="avatarDots.length > 1" class="meal-item__avatars" aria-hidden="true">
        <span v-for="dot in avatarDots" :key="dot"></span>
        <strong v-if="remainingAvatars">+{{ remainingAvatars }}</strong>
      </span>
    </div>

    <Teleport to="body">
      <div v-if="isPreviewOpen" class="recipe-preview" @click.self="closeRecipePreview" @keydown.esc="closeRecipePreview">
        <section class="recipe-preview__panel" role="dialog" aria-modal="true" aria-labelledby="recipe-preview-title">
          <header class="recipe-preview__header">
            <div>
              <h3 id="recipe-preview-title">{{ title }}</h3>
              <span>{{ previewHeadcount }} pax</span>
            </div>
            <button type="button" title="Fermer" @click="closeRecipePreview">×</button>
          </header>

          <div class="recipe-preview__times">
            <div v-if="durationBreakdown.preparation">
              <span>Préparation</span>
              <strong>{{ durationBreakdown.preparation }} min</strong>
            </div>
            <div v-if="durationBreakdown.cooking">
              <span>Cuisson</span>
              <strong>{{ durationBreakdown.cooking }} min</strong>
            </div>
            <div v-if="durationBreakdown.rest">
              <span>Repos</span>
              <strong>{{ durationBreakdown.rest }} min</strong>
            </div>
            <div v-if="durationBreakdown.total">
              <span>Total</span>
              <strong>{{ durationBreakdown.total }} min</strong>
            </div>
          </div>

          <section class="recipe-preview__section">
            <h4>Ingrédients</h4>
            <ul v-if="previewIngredients.length" class="recipe-preview__ingredients">
              <li v-for="ingredient in previewIngredients" :key="ingredient.ingredient_uuid">
                <span>{{ ingredient.name }}</span>
                <strong>{{ formatQuantity(ingredient.quantity) }} {{ ingredient.unit }}</strong>
              </li>
            </ul>
            <p v-else>Aucun ingrédient disponible.</p>
          </section>

          <p v-if="previewLoading" class="recipe-preview__muted">Chargement…</p>
          <p v-if="previewError" class="recipe-preview__error">{{ previewError }}</p>
        </section>
      </div>
    </Teleport>
  </article>
</template>

<style scoped>
.meal-item {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(44px, 1fr) auto auto;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.meal-item--clickable {
  cursor: pointer;
}

.meal-item--clickable:hover,
.meal-item--clickable:focus-visible {
  border-color: var(--color-border-hover);
  background: var(--color-surface-muted);
}

.meal-item:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.meal-item__thumbnail {
  min-height: 44px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--color-surface-muted), color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)));
  color: var(--color-text-tertiary);
  font-size: 1.05rem;
  font-weight: 800;
}

.meal-item__thumbnail img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.meal-item__body {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.meal-item__body strong,
.meal-item__body span {
  overflow-wrap: anywhere;
}

.meal-item__body strong {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.18;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meal-item__body span {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}

.meal-item__participants {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.meal-item__pax {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 700;
}

.meal-item__avatars {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  padding-left: 5px;
}

.meal-item__avatars span,
.meal-item__avatars strong {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: -5px;
  border: 1px solid var(--color-surface);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 16%, var(--color-surface));
}

.meal-item__avatars strong {
  width: auto;
  min-width: 18px;
  padding: 0 4px;
  color: var(--color-primary);
  font-size: 0.58rem;
  line-height: 1;
}

.recipe-preview {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(20, 24, 32, 0.36);
}

.recipe-preview__panel {
  width: min(560px, 100%);
  max-height: min(680px, calc(100vh - 36px));
  overflow: auto;
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 18px 60px rgba(20, 24, 32, 0.2);
}

.recipe-preview__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.recipe-preview__header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.08rem;
}

.recipe-preview__header span,
.recipe-preview__section p,
.recipe-preview__muted {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.recipe-preview__header button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
}

.recipe-preview__times {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.recipe-preview__times div {
  display: grid;
  gap: 2px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.recipe-preview__times span {
  color: var(--color-text-secondary);
  font-size: 0.76rem;
}

.recipe-preview__times strong {
  font-size: 0.88rem;
}

.recipe-preview__section {
  display: grid;
  gap: 8px;
}

.recipe-preview__section h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.96rem;
}

.recipe-preview__ingredients {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recipe-preview__ingredients li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--color-border);
}

.recipe-preview__ingredients li:last-child {
  border-bottom: 0;
}

.recipe-preview__ingredients span {
  overflow-wrap: anywhere;
}

.recipe-preview__ingredients strong {
  color: var(--color-text-secondary);
  font-weight: 600;
  white-space: nowrap;
}

.recipe-preview__error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.84rem;
}

@media (max-width: 520px) {
  .recipe-preview__times {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recipe-preview__ingredients li {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
