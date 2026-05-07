<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IngredientPicker from '@/components/planning/IngredientPicker.vue'
import MealItemRow from '@/components/planning/MealItemRow.vue'
import RecipePicker from '@/components/planning/RecipePicker.vue'
import { formatMealLabel } from '@/components/planning/mealSlotLabels'
import type { MealItemPayload, MealSlot, SlotPatchOperation } from '@/types/mealPlan'
import type { Ingredient, Recipe } from '@/types/recipe'

type AddMode = 'recipe' | 'ingredient' | 'note'

const props = defineProps<{
  slot: MealSlot
  mealLabel?: string
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

const openAddModal = (mode: AddMode = 'recipe'): void => {
  modalMode.value = mode
  headcountInput.value = defaultHeadcount()
  noteInput.value = ''
  selectedIngredient.value = null
  selectedIngredientUuid.value = ''
  ingredientQuantity.value = '1'
  ingredientUnit.value = ''
  addError.value = null
  isModalOpen.value = true
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
  <section class="meal-slot">
    <header class="meal-slot__header">
      <strong>{{ mealLabel }}</strong>
      <div class="meal-slot__headcount" aria-label="Nombre de personnes du repas">
        <span class="meal-slot__headcount-label">Pax</span>
        <button
          type="button"
          :disabled="readonly || !slot.headcount"
          title="Moins"
          @click="setHeadcount(Math.max((slot.headcount ?? 1) - 1, 0))"
        >
          −
        </button>
        <span class="meal-slot__headcount-value">{{ slot.headcount ?? '—' }}</span>
        <button
          type="button"
          :disabled="readonly"
          title="Plus"
          @click="setHeadcount((slot.headcount ?? 0) + 1)"
        >
          +
        </button>
      </div>
    </header>

    <div v-if="slot.items.length" class="meal-slot__items">
      <MealItemRow
        v-for="item in slot.items"
        :key="item.uuid"
        :item="item"
        :fallback-headcount="slot.headcount"
        :slot-date="slot.date"
        :slot-code="slot.slot_code"
        :readonly="readonly"
        @patch="emit('patch', $event)"
      />
    </div>

    <footer v-if="!readonly" class="meal-slot__footer">
      <button type="button" class="meal-slot__add" @click="openAddModal()">+ Ajouter</button>
    </footer>

    <Teleport to="body">
      <div v-if="isModalOpen" class="meal-slot-modal" @click.self="closeModal" @keydown.esc="closeModal">
        <section class="meal-slot-modal__panel" role="dialog" aria-modal="true" aria-labelledby="meal-slot-modal-title">
          <header class="meal-slot-modal__header">
            <h3 id="meal-slot-modal-title">Ajouter au repas</h3>
            <button type="button" title="Fermer" @click="closeModal">×</button>
          </header>

          <div class="meal-slot-modal__tabs" role="tablist" aria-label="Type d'élément">
            <button type="button" :class="{ 'is-active': modalMode === 'recipe' }" @click="openAddModal('recipe')">
              Recette
            </button>
            <button type="button" :class="{ 'is-active': modalMode === 'ingredient' }" @click="openAddModal('ingredient')">
              Ingrédient
            </button>
            <button type="button" :class="{ 'is-active': modalMode === 'note' }" @click="openAddModal('note')">
              Note
            </button>
          </div>

          <label v-if="modalMode !== 'note'" class="meal-slot-modal__field">
            <span>Pax</span>
            <input v-model="headcountInput" type="number" min="1" max="99" inputmode="numeric" required />
          </label>

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
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.meal-slot__header,
.meal-slot__footer,
.meal-slot__headcount {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meal-slot__header {
  justify-content: space-between;
}

.meal-slot__header strong {
  font-size: 0.96rem;
}

.meal-slot__headcount-label,
.meal-slot__headcount-value {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.meal-slot__headcount-value {
  min-width: 20px;
  text-align: center;
}

.meal-slot__headcount button,
.meal-slot__add,
.meal-slot-modal button {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}

.meal-slot__headcount button {
  width: 28px;
  height: 28px;
}

.meal-slot__items {
  display: grid;
  gap: 6px;
}

.meal-slot__footer {
  justify-content: flex-end;
}

.meal-slot__add {
  min-height: 30px;
  padding: 5px 10px;
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

.meal-slot-modal__header button {
  width: 30px;
  height: 30px;
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
  .meal-slot-modal__inline-fields {
    grid-template-columns: 1fr;
  }
}
</style>
