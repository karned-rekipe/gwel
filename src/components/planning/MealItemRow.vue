<script setup lang="ts">
import { computed, ref } from 'vue'
import { recipeService } from '@/services/recipeService'
import type { MealItem, SlotCode, SlotPatchOperation } from '@/types/mealPlan'
import type { Recipe } from '@/types/recipe'

const props = defineProps<{
  item: MealItem
  fallbackHeadcount?: number | null
  slotDate: string
  slotCode: SlotCode
  readonly?: boolean
}>()

const emit = defineEmits<{
  (event: 'patch', operations: SlotPatchOperation[]): void
}>()

const isPreviewOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const fullRecipe = ref<Recipe | null>(null)

const effectiveHeadcount = computed(() => props.item.headcount ?? props.fallbackHeadcount ?? null)
const itemUsesPax = computed(() => props.item.item_type === 'recipe' || props.item.item_type === 'ingredient')
const isRecipe = computed(() => props.item.item_type === 'recipe' && !!props.item.recipe_uuid)

const title = computed(() => {
  if (props.item.item_type === 'recipe') return props.item.recipe_snapshot?.title || 'Recette'
  if (props.item.item_type === 'ingredient') return props.item.ingredient_name || 'Ingrédient'
  if (props.item.item_type === 'prep_task') return 'Préparation'
  if (props.item.item_type === 'mixed') return 'Ancien système'
  return 'Note'
})

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
  fullRecipe.value = null
  previewLoading.value = true
  try {
    fullRecipe.value = await recipeService.getByUuid(props.item.recipe_uuid)
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : 'Fiche recette indisponible.'
  } finally {
    previewLoading.value = false
  }
}

const closeRecipePreview = (): void => {
  isPreviewOpen.value = false
}

const remove = (): void => {
  emit('patch', [{
    op: 'remove_item',
    slot_date: props.slotDate,
    slot_code: props.slotCode,
    item_uuid: props.item.uuid,
  }])
}
</script>

<template>
  <article class="meal-item">
    <div class="meal-item__body">
      <button v-if="isRecipe" type="button" class="meal-item__title-button" @click="openRecipePreview">
        {{ title }}
      </button>
      <strong v-else>{{ title }}</strong>
      <span v-if="detail">{{ detail }}</span>
    </div>

    <div class="meal-item__badges">
      <span v-if="itemUsesPax" class="meal-item__badge meal-item__badge--pax">
        {{ effectiveHeadcount ?? '?' }} pax
      </span>
      <span v-if="item.recipe_status === 'archived'" class="meal-item__badge meal-item__badge--warning">Archivée</span>
      <span v-if="item.recipe_modified" class="meal-item__badge meal-item__badge--warning">Modifiée</span>
    </div>

    <div v-if="!readonly" class="meal-item__actions">
      <button type="button" title="Supprimer" @click="remove">×</button>
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
  min-height: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 6px;
  align-items: center;
  padding: 7px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.meal-item__body {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.meal-item__body strong,
.meal-item__title-button,
.meal-item__body span {
  overflow-wrap: anywhere;
}

.meal-item__body strong,
.meal-item__title-button {
  font-size: 0.92rem;
}

.meal-item__title-button {
  justify-self: start;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  padding: 0;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.meal-item__title-button:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.meal-item__body span {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.meal-item__badges,
.meal-item__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.meal-item__badge {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  white-space: nowrap;
}

.meal-item__badge--pax {
  color: var(--color-primary);
  background: rgba(0, 122, 255, 0.08);
}

.meal-item__badge--warning {
  color: var(--color-danger);
  background: rgba(215, 0, 21, 0.08);
}

.meal-item__actions button {
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
  cursor: pointer;
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
  .meal-item {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .meal-item__badges {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .recipe-preview__times {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recipe-preview__ingredients li {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
