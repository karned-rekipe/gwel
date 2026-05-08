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

const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const isModalOpen = ref(false)
const activeAddMode = ref<AddMode | null>(null)
const headcountInput = ref('')
const noteInput = ref('')
const selectedIngredient = ref<Ingredient | null>(null)
const selectedIngredientUuid = ref('')
const ingredientQuantity = ref('1')
const ingredientUnit = ref('')
const addError = ref<string | null>(null)

const mealLabel = computed(() => props.mealLabel ?? formatMealLabel(props.slot.slot_code))
const plannedItemCount = computed(() => props.slot.items.length)
const slotHeadcount = computed(() => props.slot.headcount ?? null)
const slotAvatarDots = computed(() => Array.from({ length: Math.min(slotHeadcount.value ?? 0, 4) }, (_, index) => index))
const slotRemainingAvatars = computed(() => Math.max((slotHeadcount.value ?? 0) - slotAvatarDots.value.length, 0))
const slotHeadcountLabel = computed(() => {
  const headcount = slotHeadcount.value
  if (!headcount) return ''
  return `${headcount} personne${headcount > 1 ? 's' : ''}`
})
const plannedItemLabel = computed(() => {
  const count = plannedItemCount.value
  return `${count} élément${count > 1 ? 's' : ''} prévu${count > 1 ? 's' : ''}`
})
const hasSlotIndicators = computed(() => plannedItemCount.value > 0 || Boolean(slotHeadcount.value))
const slotFullDateLabel = computed(() => fullDateFormatter.format(new Date(`${props.slot.date}T12:00:00`)))

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

const openEditorModal = (mode: AddMode | null = null): void => {
  if (props.readonly) return
  activeAddMode.value = mode
  headcountInput.value = defaultHeadcount()
  resetItemForm()
  isModalOpen.value = true
}

const switchMode = (mode: AddMode): void => {
  activeAddMode.value = mode
  resetItemForm()
}

const closeModal = (): void => {
  isModalOpen.value = false
}

const returnToOverview = (): void => {
  activeAddMode.value = null
  resetItemForm()
}

watch(
  () => props.slot.headcount,
  (headcount) => {
    if (!isModalOpen.value || activeAddMode.value === 'note' || headcountInput.value.trim()) return
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
  returnToOverview()
}

const removeItem = (item: MealItem): void => {
  emit('patch', [{
    op: 'remove_item',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    item_uuid: item.uuid,
  }])
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
      'meal-slot--with-indicators': hasSlotIndicators,
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

    <div v-if="hasSlotIndicators" class="meal-slot__indicators">
      <span
        v-if="plannedItemCount"
        class="meal-slot__planned-count"
        :aria-label="plannedItemLabel"
      >
        <span aria-hidden="true">🍽</span>
        {{ plannedItemCount }}
      </span>
      <span v-if="slotAvatarDots.length" class="meal-slot__headcount-avatars" aria-hidden="true">
        <span v-for="dot in slotAvatarDots" :key="dot"></span>
        <strong v-if="slotRemainingAvatars">+{{ slotRemainingAvatars }}</strong>
      </span>
      <span
        v-if="slotHeadcount"
        class="meal-slot__headcount-pax"
        :aria-label="slotHeadcountLabel"
      >
        <span aria-hidden="true">👤</span>
        {{ slotHeadcount }}
      </span>
    </div>

    <div v-if="!collapsed && slot.items.length" class="meal-slot__items">
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

    <div v-else-if="!collapsed && slotHeadcount" class="meal-slot__empty-state"></div>

    <Teleport to="body">
      <div v-if="isModalOpen" class="meal-slot-modal" @click.self="closeModal" @keydown.esc="closeModal">
        <section class="meal-slot-modal__panel" role="dialog" aria-modal="true" aria-labelledby="meal-slot-modal-title">
          <header class="meal-slot-modal__header">
            <h3 id="meal-slot-modal-title">{{ mealLabel }} · {{ slotFullDateLabel }}</h3>
            <span class="meal-slot-modal__headcount" :aria-label="slotHeadcountLabel || undefined">
              <template v-if="slotHeadcount">
                <span aria-hidden="true">👤</span>
                {{ slotHeadcount }}
              </template>
            </span>
            <div class="meal-slot-modal__header-actions">
              <span v-if="slotAvatarDots.length" class="meal-slot-modal__avatars" aria-hidden="true">
                <span v-for="dot in slotAvatarDots" :key="dot"></span>
                <strong v-if="slotRemainingAvatars">+{{ slotRemainingAvatars }}</strong>
              </span>
              <button type="button" title="Fermer" @click="closeModal">×</button>
            </div>
          </header>

          <section class="meal-slot-modal__existing" aria-label="Contenu du repas">
            <div v-if="slot.items.length" class="meal-slot-modal__planned-list">
              <article v-for="item in slot.items" :key="item.uuid" class="meal-slot-modal__planned-item">
                <MealItemRow
                  :item="item"
                  :fallback-headcount="slot.headcount"
                  :slot-date="slot.date"
                  :slot-code="slot.slot_code"
                  :readonly="readonly"
                />
                <button
                  v-if="!readonly"
                  type="button"
                  class="meal-slot-modal__remove"
                  title="Retirer du repas"
                  aria-label="Retirer ce contenu du repas"
                  @click="removeItem(item)"
                >
                  <span aria-hidden="true">🗑</span>
                </button>
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

          <div class="meal-slot-modal__actions" aria-label="Ajouter un contenu au repas">
            <button type="button" :class="{ 'is-active': activeAddMode === 'recipe' }" @click="switchMode('recipe')">
              <span aria-hidden="true">+</span>
              Recette
            </button>
            <button type="button" :class="{ 'is-active': activeAddMode === 'ingredient' }" @click="switchMode('ingredient')">
              <span aria-hidden="true">+</span>
              Ingrédient
            </button>
            <button type="button" :class="{ 'is-active': activeAddMode === 'note' }" @click="switchMode('note')">
              <span aria-hidden="true">+</span>
              Note
            </button>
          </div>

          <div v-if="activeAddMode === 'recipe'" class="meal-slot-modal__content">
            <RecipePicker button-label="Ajouter" @select="addRecipe" />
          </div>

          <form v-else-if="activeAddMode === 'ingredient'" class="meal-slot-modal__form" @submit.prevent="addIngredient">
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

          <form v-else-if="activeAddMode === 'note'" class="meal-slot-modal__form" @submit.prevent="addNote">
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
  position: relative;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 6px;
  overflow: auto;
}

.meal-slot--with-indicators:not(.meal-slot--collapsed) .meal-slot__items,
.meal-slot--with-indicators:not(.meal-slot--collapsed) .meal-slot__empty-state {
  padding-top: 28px;
}

.meal-slot__indicators {
  position: absolute;
  top: 6px;
  right: 6px;
  left: 6px;
  z-index: 1;
  min-height: 22px;
  pointer-events: none;
}

.meal-slot__planned-count,
.meal-slot__headcount-pax,
.meal-slot__headcount-avatars {
  position: absolute;
  top: 0;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  font-size: 0.72rem;
  font-weight: 750;
  line-height: 1;
}

.meal-slot__planned-count {
  left: 0;
  gap: 4px;
  color: var(--color-primary);
}

.meal-slot__headcount-avatars {
  left: 50%;
  max-width: min(46%, 92px);
  overflow: hidden;
  padding-left: 5px;
  transform: translateX(-50%);
}

.meal-slot__headcount-pax {
  right: 0;
  align-items: center;
  gap: 3px;
  color: var(--color-primary);
}

.meal-slot__headcount-avatars span,
.meal-slot__headcount-avatars strong {
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

.meal-slot__headcount-avatars strong {
  width: auto;
  min-width: 18px;
  padding: 0 4px;
  color: var(--color-primary);
  font-size: 0.58rem;
  line-height: 1;
}

.meal-slot__empty-state {
  min-height: 0;
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
  width: min(680px, 100%);
  max-height: min(760px, calc(100vh - 36px));
  overflow: auto;
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 18px 60px rgba(20, 24, 32, 0.2);
}

.meal-slot-modal__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.meal-slot-modal__header h3 {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.98rem;
  font-weight: 750;
}

.meal-slot-modal__headcount {
  min-width: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--color-primary);
  font-size: 0.86rem;
  font-weight: 750;
}

.meal-slot-modal__header-actions {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.meal-slot-modal__avatars {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  padding-left: 5px;
}

.meal-slot-modal__avatars span,
.meal-slot-modal__avatars strong {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: -5px;
  border: 1px solid var(--color-surface);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 16%, var(--color-surface));
}

.meal-slot-modal__avatars strong {
  width: auto;
  min-width: 20px;
  padding: 0 5px;
  color: var(--color-primary);
  font-size: 0.6rem;
  line-height: 1;
}

.meal-slot-modal__header button {
  width: 30px;
  height: 30px;
}

.meal-slot-modal__existing {
  display: grid;
  gap: 8px;
  padding: 0;
}

.meal-slot-modal__existing p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.meal-slot-modal__planned-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, 170px);
  grid-auto-rows: 238px;
  gap: 8px;
  justify-content: start;
}

.meal-slot-modal__planned-item {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.meal-slot-modal__planned-item :deep(.meal-item) {
  height: 100%;
}

.meal-slot-modal__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-color: color-mix(in srgb, var(--color-border) 70%, transparent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  color: var(--color-danger);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
}

.meal-slot-modal__remove:hover,
.meal-slot-modal__remove:focus-visible {
  border-color: color-mix(in srgb, var(--color-danger) 34%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 9%, var(--color-surface));
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

.meal-slot-modal__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.meal-slot-modal__actions button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.meal-slot-modal__actions button span {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
}

.meal-slot-modal__actions button.is-active {
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
  .meal-slot__items,
  .meal-slot-modal__actions,
  .meal-slot-modal__inline-fields,
  .meal-slot-modal__headcount-row {
    grid-template-columns: 1fr;
  }

  .meal-slot-modal__header {
    grid-template-columns: 1fr auto;
  }

  .meal-slot-modal__headcount {
    grid-column: 1;
    justify-self: start;
  }

  .meal-slot-modal__header-actions {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}
</style>
