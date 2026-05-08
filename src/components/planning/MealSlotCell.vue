<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IngredientPicker from '@/components/planning/IngredientPicker.vue'
import MealItemRow from '@/components/planning/MealItemRow.vue'
import RecipePicker from '@/components/planning/RecipePicker.vue'
import { formatMealLabel } from '@/components/planning/mealSlotLabels'
import type { MealItem, MealItemPayload, MealSlot, SlotPatchOperation } from '@/types/mealPlan'
import type { Ingredient, Recipe } from '@/types/recipe'

type AddMode = 'recipe' | 'ingredient' | 'note'

const props = defineProps<{
  slot: MealSlot
  mealLabel?: string
  showMealLabel?: boolean
  collapsed?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  (event: 'patch', operations: SlotPatchOperation[]): void
}>()

const isModalOpen = ref(false)
const modalMode = ref<AddMode>('recipe')
const headcountInput = ref('')
const noteInput = ref('')
const selectedIngredient = ref<Ingredient | null>(null)
const selectedIngredientUuid = ref('')
const ingredientQuantity = ref('1')
const ingredientUnit = ref('')
const addError = ref<string | null>(null)

const mealLabel = computed(() => props.mealLabel ?? formatMealLabel(props.slot.slot_code))

const defaultHeadcount = (): string => {
  if (props.slot.headcount !== null && props.slot.headcount !== undefined && props.slot.headcount > 0) {
    return String(props.slot.headcount)
  }
  return ''
}

const resetItemForm = (): void => {
  noteInput.value = ''
  selectedIngredient.value = null
  selectedIngredientUuid.value = ''
  ingredientQuantity.value = '1'
  ingredientUnit.value = ''
  addError.value = null
}

const openEditorModal = (mode: AddMode = 'recipe'): void => {
  if (props.readonly) return
  modalMode.value = mode
  headcountInput.value = defaultHeadcount()
  resetItemForm()
  isModalOpen.value = true
}

const switchMode = (mode: AddMode): void => {
  modalMode.value = mode
  resetItemForm()
}

const closeModal = (): void => {
  isModalOpen.value = false
}

watch(
  () => props.slot.headcount,
  (headcount) => {
    if (!isModalOpen.value || modalMode.value === 'note' || headcountInput.value.trim()) return
    if (headcount !== null && headcount !== undefined && headcount > 0) {
      headcountInput.value = String(headcount)
    }
  },
)

const setHeadcount = (value: number | null): void => {
  emit('patch', [{
    op: 'set_headcount',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    headcount: value,
  }])
}

const saveDefaultHeadcount = (): void => {
  const rawValue = headcountInput.value.trim()
  if (!rawValue) {
    setHeadcount(null)
    return
  }
  const headcount = positiveIntegerFrom(rawValue)
  if (headcount === null) {
    addError.value = 'Le nombre de pax doit être un entier positif.'
    return
  }
  addError.value = null
  setHeadcount(headcount)
}

const positiveIntegerFrom = (value: string): number | null => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

const positiveNumberFrom = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

const requiredHeadcount = (): number | null => {
  const headcount = positiveIntegerFrom(headcountInput.value)
  if (headcount === null) {
    addError.value = 'Le nombre de pax est obligatoire.'
  }
  return headcount
}

const addItem = (item: MealItemPayload): void => {
  emit('patch', [{
    op: 'add_item',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    item,
  }])
  closeModal()
}

const removeItem = (item: MealItem): void => {
  emit('patch', [{
    op: 'remove_item',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    item_uuid: item.uuid,
  }])
}

const itemTitle = (item: MealItem): string => {
  if (item.item_type === 'recipe') return item.recipe_snapshot?.title || 'Recette'
  if (item.item_type === 'ingredient') return item.ingredient_name || 'Ingrédient'
  if (item.item_type === 'prep_task') return 'Préparation'
  if (item.item_type === 'mixed') return 'Ancien système'
  return item.note || 'Note'
}

const itemMeta = (item: MealItem): string => {
  const parts: string[] = []
  const headcount = item.headcount ?? props.slot.headcount ?? null
  if ((item.item_type === 'recipe' || item.item_type === 'ingredient') && headcount) {
    parts.push(`${headcount} pax`)
  }
  if (item.item_type === 'ingredient' && item.ingredient_quantity && item.ingredient_unit) {
    parts.push(`${item.ingredient_quantity} ${item.ingredient_unit} / pax`)
  }
  if (item.recipe_snapshot?.total_duration_min) {
    parts.push(`${item.recipe_snapshot.total_duration_min} min`)
  }
  return parts.join(' · ')
}

const addRecipe = (recipe: Recipe): void => {
  const headcount = requiredHeadcount()
  if (headcount === null) return
  addItem({
    item_type: 'recipe',
    recipe_uuid: recipe.uuid,
    recipe_snapshot: {
      recipe_uuid: recipe.uuid,
      title: recipe.name,
      short_description: recipe.description ?? null,
      servings_default: recipe.servings ?? headcount,
      total_duration_min: null,
      ingredients: [],
      snapshot_taken_at: new Date().toISOString(),
      recipe_version: recipe.version,
    },
    headcount,
  })
}

const selectIngredient = (ingredient: Ingredient): void => {
  selectedIngredient.value = ingredient
  selectedIngredientUuid.value = ingredient.uuid
  ingredientUnit.value = ingredient.unit ?? ''
  addError.value = null
}

const addIngredient = (): void => {
  const headcount = requiredHeadcount()
  const quantity = positiveNumberFrom(ingredientQuantity.value)
  const unit = ingredientUnit.value.trim()

  if (headcount === null) return
  if (!selectedIngredient.value) {
    addError.value = "L'ingrédient doit être sélectionné dans la collection."
    return
  }
  if (quantity === null) {
    addError.value = 'La quantité par pax est obligatoire.'
    return
  }
  if (!unit) {
    addError.value = "L'unité doit être définie sur la fiche ingrédient."
    return
  }

  addItem({
    item_type: 'ingredient',
    ingredient_uuid: selectedIngredient.value.uuid,
    ingredient_name: selectedIngredient.value.name,
    ingredient_quantity: quantity,
    ingredient_unit: unit,
    headcount,
  })
}

const addNote = (): void => {
  const note = noteInput.value.trim()
  if (!note) {
    addError.value = 'La note est obligatoire.'
    return
  }
  addItem({
    item_type: 'note',
    note,
  })
}
</script>

<template>
  <section
    class="meal-slot"
    :class="{
      'meal-slot--empty': !slot.items.length && !collapsed,
      'meal-slot--collapsed': collapsed,
      'meal-slot--editable': !readonly,
      'meal-slot--without-label': showMealLabel === false,
    }"
    :role="readonly ? undefined : 'button'"
    :tabindex="readonly ? undefined : 0"
    :aria-label="readonly ? undefined : `Modifier ${mealLabel} du ${slot.date}`"
    @click="openEditorModal()"
    @keydown.enter="openEditorModal()"
    @keydown.space.prevent="openEditorModal()"
  >
    <header v-if="showMealLabel !== false" class="meal-slot__header">
      <strong>{{ mealLabel }}</strong>
    </header>

    <span v-if="collapsed && slot.items.length" class="meal-slot__collapsed-count">
      {{ slot.items.length }}
    </span>

    <div v-else-if="slot.items.length" class="meal-slot__items">
      <MealItemRow
        v-for="item in slot.items"
        :key="item.uuid"
        :item="item"
        :fallback-headcount="slot.headcount"
        :slot-date="slot.date"
        :slot-code="slot.slot_code"
        :readonly="readonly"
      />
    </div>

    <Teleport to="body">
      <div v-if="isModalOpen" class="meal-slot-modal" @click.self="closeModal" @keydown.esc="closeModal">
        <section class="meal-slot-modal__panel" role="dialog" aria-modal="true" aria-labelledby="meal-slot-modal-title">
          <header class="meal-slot-modal__header">
            <div>
              <h3 id="meal-slot-modal-title">Modifier le repas</h3>
              <span>{{ mealLabel }} · {{ slot.date }}</span>
            </div>
            <button type="button" title="Fermer" @click="closeModal">×</button>
          </header>

          <section class="meal-slot-modal__existing" aria-label="Repas prévus">
            <h4>Repas prévus</h4>
            <div v-if="slot.items.length" class="meal-slot-modal__planned-list">
              <article v-for="item in slot.items" :key="item.uuid" class="meal-slot-modal__planned-item">
                <div>
                  <strong>{{ itemTitle(item) }}</strong>
                  <span v-if="itemMeta(item)">{{ itemMeta(item) }}</span>
                </div>
                <button v-if="!readonly" type="button" @click="removeItem(item)">Retirer</button>
              </article>
            </div>
            <p v-else>Aucun contenu prévu.</p>
          </section>

          <div class="meal-slot-modal__headcount-row">
            <label class="meal-slot-modal__field">
              <span>Pax par défaut</span>
              <input v-model="headcountInput" type="number" min="1" max="99" inputmode="numeric" />
            </label>
            <button type="button" @click="saveDefaultHeadcount">Appliquer</button>
          </div>

          <div class="meal-slot-modal__tabs" role="tablist" aria-label="Type d'élément">
            <button type="button" :class="{ 'is-active': modalMode === 'recipe' }" @click="switchMode('recipe')">
              Recette
            </button>
            <button type="button" :class="{ 'is-active': modalMode === 'ingredient' }" @click="switchMode('ingredient')">
              Ingrédient
            </button>
            <button type="button" :class="{ 'is-active': modalMode === 'note' }" @click="switchMode('note')">
              Note
            </button>
          </div>

          <div v-if="modalMode === 'recipe'" class="meal-slot-modal__content">
            <RecipePicker button-label="Ajouter" @select="addRecipe" />
          </div>

          <form v-else-if="modalMode === 'ingredient'" class="meal-slot-modal__form" @submit.prevent="addIngredient">
            <label class="meal-slot-modal__field">
              <span>Ingrédient</span>
              <IngredientPicker
                v-model="selectedIngredientUuid"
                @select="selectIngredient"
              />
            </label>
            <div class="meal-slot-modal__inline-fields">
              <label class="meal-slot-modal__field">
                <span>Qté / pax</span>
                <input v-model="ingredientQuantity" type="number" min="0.01" step="0.01" inputmode="decimal" required />
              </label>
              <label class="meal-slot-modal__field">
                <span>Unité</span>
                <input v-model="ingredientUnit" type="text" readonly required />
              </label>
            </div>
            <button type="submit" class="meal-slot-modal__submit">Ajouter</button>
          </form>

          <form v-else class="meal-slot-modal__form" @submit.prevent="addNote">
            <label class="meal-slot-modal__field">
              <span>Note</span>
              <textarea v-model="noteInput" rows="4" required />
            </label>
            <button type="submit" class="meal-slot-modal__submit">Ajouter</button>
          </form>

          <p v-if="addError" class="meal-slot-modal__error">{{ addError }}</p>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.meal-slot {
  min-width: 0;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 6px;
  padding: 0;
  background: transparent;
}

.meal-slot--without-label {
  grid-template-rows: minmax(0, 1fr);
}

.meal-slot--collapsed {
  display: grid;
  place-items: center;
  padding: 0;
}

.meal-slot--editable {
  cursor: pointer;
}

.meal-slot--editable:hover,
.meal-slot--editable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-primary) 52%, transparent);
  outline-offset: -2px;
}

.meal-slot--empty {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px;
  background: color-mix(in srgb, var(--color-surface-muted) 80%, transparent);
}

.meal-slot__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meal-slot__header strong {
  font-size: 0.96rem;
}

.meal-slot-modal button {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}

.meal-slot__items {
  display: grid;
  align-content: start;
  gap: 6px;
  overflow: auto;
}

.meal-slot__collapsed-count {
  min-width: 20px;
  min-height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 700;
}

.meal-slot-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(20, 24, 32, 0.36);
}

.meal-slot-modal__panel {
  width: min(520px, 100%);
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 18px 60px rgba(20, 24, 32, 0.2);
}

.meal-slot-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meal-slot-modal__header h3 {
  margin: 0;
  font-size: 1rem;
}

.meal-slot-modal__header span {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.meal-slot-modal__header button {
  width: 30px;
  height: 30px;
}

.meal-slot-modal__existing {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.meal-slot-modal__existing h4,
.meal-slot-modal__existing p {
  margin: 0;
}

.meal-slot-modal__existing h4 {
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.meal-slot-modal__existing p {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.meal-slot-modal__planned-list {
  display: grid;
  gap: 6px;
}

.meal-slot-modal__planned-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.meal-slot-modal__planned-item div {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.meal-slot-modal__planned-item strong,
.meal-slot-modal__planned-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-slot-modal__planned-item span {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.meal-slot-modal__planned-item button {
  min-height: 30px;
  padding: 5px 8px;
}

.meal-slot-modal__headcount-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
}

.meal-slot-modal__headcount-row button {
  min-height: 34px;
  padding: 6px 10px;
}

.meal-slot-modal__tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.meal-slot-modal__tabs button {
  min-height: 32px;
}

.meal-slot-modal__tabs button.is-active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(0, 122, 255, 0.08);
}

.meal-slot-modal__content,
.meal-slot-modal__form {
  display: grid;
  gap: 10px;
}

.meal-slot-modal__field {
  display: grid;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.meal-slot-modal__field input,
.meal-slot-modal__field textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 0.92rem;
}

.meal-slot-modal__field input {
  min-height: 34px;
  padding: 6px 8px;
}

.meal-slot-modal__field input[readonly] {
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
}

.meal-slot-modal__field textarea {
  resize: vertical;
  padding: 8px;
}

.meal-slot-modal__inline-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.meal-slot-modal__submit {
  min-height: 34px;
  padding: 6px 10px;
  justify-self: end;
  border-color: var(--color-primary);
  color: white;
  background: var(--color-primary);
}

.meal-slot-modal__error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.84rem;
}

@media (max-width: 520px) {
  .meal-slot-modal__tabs,
  .meal-slot-modal__inline-fields,
  .meal-slot-modal__headcount-row,
  .meal-slot-modal__planned-item {
    grid-template-columns: 1fr;
  }
}
</style>
