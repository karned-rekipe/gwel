<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HouseholdMemberAvatarStack from '@/components/planning/HouseholdMemberAvatarStack.vue'
import HouseholdMemberPillList from '@/components/planning/HouseholdMemberPillList.vue'
import IngredientPicker from '@/components/planning/IngredientPicker.vue'
import MealItemRow from '@/components/planning/MealItemRow.vue'
import MemberSelector from '@/components/planning/MemberSelector.vue'
import PlanningRecipePreviewModal from '@/components/planning/PlanningRecipePreviewModal.vue'
import RecipePicker from '@/components/planning/RecipePicker.vue'
import {
  mealSlotActions,
  type MealSlotAddMode,
} from '@/components/planning/mealSlotActions'
import { formatMealLabel } from '@/components/planning/mealSlotLabels'
import { membersForIds } from '@/components/planning/memberDisplay'
import { useIngredientWishlistStore } from '@/stores/ingredientWishlistStore'
import { useRecipeWishlistStore } from '@/stores/recipeWishlistStore'
import type { HouseholdMember } from '@/types/householdMember'
import type { MealItem, MealItemPayload, MealPreparationOpenRequest, MealSlot, SlotPatchOperation } from '@/types/mealPlan'
import type { Ingredient, Recipe } from '@/types/recipe'

type ItemActionMode = 'move' | 'members'
type MoveSlotRow = { slot_code: string; label: string }

const props = defineProps<{
  slot: MealSlot
  mealLabel?: string
  showMealLabel?: boolean
  collapsed?: boolean
  expanded?: boolean
  readonly?: boolean
  householdMembers?: HouseholdMember[]
  usesNamedMembers?: boolean
  availableSlotRows?: MoveSlotRow[]
  openRecipeDetails?: boolean
}>()

const emit = defineEmits<{
  (event: 'patch', operations: SlotPatchOperation[]): void
  (event: 'openRecipe', request: MealPreparationOpenRequest): void
}>()

const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const moveDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const moveDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })
const moveFullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const isModalOpen = ref(false)
const activeAddMode = ref<MealSlotAddMode | null>(null)
const activeItemActionMode = ref<ItemActionMode | null>(null)
const activeItemUuid = ref<string | null>(null)
const itemHeadcountInput = ref('')
const headcountInput = ref('')
const noteInput = ref('')
const selectedIngredient = ref<Ingredient | null>(null)
const selectedIngredientUuid = ref('')
const slotMemberDraftIds = ref<string[]>([])
const itemMemberDraftIds = ref<string[]>([])
const addError = ref<string | null>(null)
const previewRecipe = ref<{ uuid: string; name: string } | null>(null)
const wishlist = useRecipeWishlistStore()
const ingredientWishlist = useIngredientWishlistStore()

const mealLabel = computed(() => props.mealLabel ?? formatMealLabel(props.slot.slot_code))
const plannedItemCount = computed(() => props.slot.items.length)
const slotMemberIds = computed(() => props.usesNamedMembers ? (props.slot.member_ids ?? []) : [])
const slotMembers = computed(() => membersForIds(slotMemberIds.value, props.householdMembers ?? []))
const slotResolvedMemberIds = computed(() => slotMembers.value.map((member) => member.uuid))
const slotHeadcount = computed(() => (
  props.usesNamedMembers
    ? slotMembers.value.length || null
    : props.slot.headcount ?? null
))
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
const menuItemCountLabel = computed(() => {
  const count = plannedItemCount.value
  return `${count} élément${count > 1 ? 's' : ''}`
})
const attendanceLabel = computed(() => {
  const count = slotHeadcount.value
  if (!count) return 'Aucun convive'
  return `${count} convive${count > 1 ? 's' : ''}`
})
const hasSlotIndicators = computed(() => plannedItemCount.value > 0 || Boolean(slotHeadcount.value))
const slotFullDateLabel = computed(() => fullDateFormatter.format(new Date(`${props.slot.date}T12:00:00`)))
const hasNamedMemberSection = computed(() => Boolean(props.usesNamedMembers))
const activeItem = computed(() => props.slot.items.find((item) => item.uuid === activeItemUuid.value) ?? null)
const moveSlotRows = computed<MoveSlotRow[]>(() => (
  props.availableSlotRows?.length ? props.availableSlotRows : [{ slot_code: props.slot.slot_code, label: mealLabel.value }]
))
const moveDateColumns = computed(() => Array.from({ length: 22 }, (_, index) => {
  const date = addDaysToIso(props.slot.date, index - 7)
  const parsed = new Date(`${date}T12:00:00`)
  return {
    date,
    dayLabel: moveDayFormatter.format(parsed),
    dateLabel: moveDateFormatter.format(parsed),
    fullLabel: moveFullDateFormatter.format(parsed),
  }
}))
const moveGridTemplateColumns = computed(() => `96px repeat(${moveDateColumns.value.length}, minmax(92px, 1fr))`)
const availableItemMembers = computed<HouseholdMember[]>(() => props.householdMembers ?? [])
const isModalSubviewOpen = computed(() => activeAddMode.value !== null || activeItemActionMode.value !== null)
const modalSubviewTitle = computed(() => {
  if (activeItemActionMode.value === 'move') return 'Déplacer'
  if (activeItemActionMode.value === 'members') return 'Participants'
  if (activeAddMode.value === 'recipe') return 'Ajouter une recette'
  if (activeAddMode.value === 'wishlist') return 'Liste d’envies'
  if (activeAddMode.value === 'ingredient') return 'Ajouter un ingrédient'
  if (activeAddMode.value === 'note') return 'Ajouter une note'
  return ''
})

const isoFromDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDaysToIso = (value: string, daysToAdd: number): string => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + daysToAdd)
  return isoFromDate(date)
}

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
  addError.value = null
}

const openEditorModal = (mode: MealSlotAddMode | null = null): void => {
  if (props.readonly) return
  activeAddMode.value = mode
  activeItemActionMode.value = null
  activeItemUuid.value = null
  headcountInput.value = defaultHeadcount()
  resetItemForm()
  isModalOpen.value = true
}

const switchMode = (mode: MealSlotAddMode): void => {
  activeAddMode.value = mode
  activeItemActionMode.value = null
  activeItemUuid.value = null
  resetItemForm()
  if (mode === 'wishlist') {
    void Promise.all([wishlist.loadRecipes(), ingredientWishlist.loadIngredients()])
  }
}

const selectAddAction = (mode: MealSlotAddMode | null): void => {
  if (mode) switchMode(mode)
}

const closeModal = (): void => {
  previewRecipe.value = null
  isModalOpen.value = false
}

const recipeUuidForItem = (item: MealItem): string | null => (
  item.item_type === 'recipe'
    ? item.recipe_uuid ?? item.recipe_snapshot?.recipe_uuid ?? null
    : null
)

const openRecipePreview = (item: MealItem): void => {
  const uuid = recipeUuidForItem(item)
  if (!uuid) return
  previewRecipe.value = {
    uuid,
    name: item.recipe_snapshot?.title?.trim() || 'Recette',
  }
}

const closeRecipePreview = (): void => {
  previewRecipe.value = null
}

const returnToOverview = (): void => {
  activeAddMode.value = null
  activeItemActionMode.value = null
  activeItemUuid.value = null
  resetItemForm()
}

const closeSubview = (): void => {
  activeAddMode.value = null
  activeItemActionMode.value = null
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
    addError.value = 'Le nombre de personnes doit être un entier positif.'
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

const requiredHeadcount = (): number | null => {
  const headcount = positiveIntegerFrom(headcountInput.value)
  if (headcount === null) {
    addError.value = 'Le nombre de personnes est obligatoire.'
  }
  return headcount
}

const requiredItemHeadcount = (): number | null => {
  if (props.usesNamedMembers) {
    const headcount = slotMembers.value.length
    if (!headcount) {
      addError.value = 'Aucune personne nommée pour ce repas.'
      return null
    }
    addError.value = null
    return headcount
  }
  return requiredHeadcount()
}

const memberIdsForNewItem = (): string[] => (props.usesNamedMembers ? slotMembers.value.map((member) => member.uuid) : [])

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

const payloadFromItem = (item: MealItem): MealItemPayload => ({
  item_type: item.item_type,
  headcount: item.headcount ?? null,
  member_ids: item.member_ids ?? [],
  recipe_uuid: item.recipe_uuid ?? null,
  recipe_snapshot: item.recipe_snapshot ?? null,
  preparation_progress: item.preparation_progress ?? null,
  ingredient_uuid: item.ingredient_uuid ?? null,
  ingredient_name: item.ingredient_name ?? null,
  ingredient_quantity: item.ingredient_quantity ?? null,
  ingredient_unit: item.ingredient_unit ?? null,
  note: item.note ?? null,
  legacy_id: item.legacy_id ?? null,
})

const openItemActions = (item: MealItem): void => {
  activeAddMode.value = null
  activeItemActionMode.value = null
  activeItemUuid.value = activeItemUuid.value === item.uuid ? null : item.uuid
  itemHeadcountInput.value = String(item.headcount ?? slotHeadcount.value ?? '')
  addError.value = null
}

const openItemActionMode = (mode: ItemActionMode, item: MealItem): void => {
  activeAddMode.value = null
  activeItemActionMode.value = mode
  activeItemUuid.value = item.uuid
  if (mode === 'members') {
    itemMemberDraftIds.value = memberIdsForItem(item)
  }
  addError.value = null
}

const openSlotMemberPicker = (): void => {
  activeAddMode.value = null
  activeItemActionMode.value = 'members'
  activeItemUuid.value = null
  slotMemberDraftIds.value = [...slotResolvedMemberIds.value]
  addError.value = null
}

const moveItem = (item: MealItem, target: { date: string; slot_code: string }): void => {
  if (!target.date || !target.slot_code) {
    addError.value = 'Choisis un repas de destination.'
    return
  }
  emit('patch', [
    {
      op: 'remove_item',
      slot_date: props.slot.date,
      slot_code: props.slot.slot_code,
      item_uuid: item.uuid,
    },
    {
      op: 'add_item',
      slot_date: target.date,
      slot_code: target.slot_code,
      item: payloadFromItem(item),
    },
  ])
  activeItemActionMode.value = null
  activeItemUuid.value = null
}

const isCurrentMoveTarget = (date: string, slotCode: string): boolean =>
  date === props.slot.date && slotCode === props.slot.slot_code

const addItemToWishlist = (item: MealItem): void => {
  if (item.recipe_uuid) {
    wishlist.add(item.recipe_uuid)
    activeItemUuid.value = null
  } else if (item.ingredient_uuid) {
    ingredientWishlist.add(item.ingredient_uuid)
    activeItemUuid.value = null
  } else {
    addError.value = 'Seules les recettes et les ingrédients peuvent être ajoutés aux envies.'
  }
}

const updateItemHeadcount = (item: MealItem): void => {
  const headcount = positiveIntegerFrom(itemHeadcountInput.value)
  if (headcount === null) {
    addError.value = 'Le nombre de personnes doit être un entier positif.'
    return
  }
  emit('patch', [{
    op: 'update_item',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    item_uuid: item.uuid,
    item: {
      ...payloadFromItem(item),
      headcount,
    },
  }])
  activeItemUuid.value = null
}

const memberIdsForItem = (item: MealItem): string[] => {
  const itemMemberIds = item.member_ids ?? []
  return itemMemberIds.length ? [...itemMemberIds] : [...slotMemberIds.value]
}

const updateItemMembers = (item: MealItem, memberIds: string[]): void => {
  if (!memberIds.length) {
    addError.value = 'Au moins un participant doit rester associé à ce contenu.'
    return
  }
  addError.value = null
  emit('patch', [{
    op: 'update_item',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    item_uuid: item.uuid,
    item: {
      ...payloadFromItem(item),
      headcount: memberIds.length,
      member_ids: memberIds,
    },
  }])
}

const setItemMembers = (item: MealItem, memberIds: string[]): void => {
  if (!memberIds.length) {
    addError.value = 'Au moins un participant doit rester associé à ce contenu.'
    return
  }
  itemMemberDraftIds.value = memberIds
  updateItemMembers(item, memberIds)
}

const updateSlotMembers = (memberIds: string[]): void => {
  addError.value = null
  emit('patch', [{
    op: 'set_members',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    member_ids: memberIds,
  }])
}

const setSlotMembers = (memberIds: string[]): void => {
  slotMemberDraftIds.value = memberIds
  updateSlotMembers(memberIds)
}

const addRecipe = (recipe: Recipe): boolean => {
  const headcount = requiredItemHeadcount()
  if (headcount === null) return false
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
    member_ids: memberIdsForNewItem(),
  })
  return true
}

const addWishlistRecipe = (recipe: Recipe): void => {
  if (addRecipe(recipe)) {
    wishlist.remove(recipe.uuid)
  }
}

const unitFromIngredient = (ingredient: Ingredient): string => {
  const referenceUnit = ingredient.unit_profile?.reference_unit
  return (
    ingredient.unit?.trim() ||
    ingredient.unit_profile?.default_recipe_unit?.trim() ||
    (referenceUnit && referenceUnit !== 'unknown' ? referenceUnit : '')
  )
}

const selectIngredient = (ingredient: Ingredient): void => {
  selectedIngredient.value = ingredient
  selectedIngredientUuid.value = ingredient.uuid
  addError.value = null
}

const addIngredient = (ingredient?: Ingredient): boolean => {
  if (ingredient) {
    selectIngredient(ingredient)
  }

  const headcount = requiredItemHeadcount()
  const ingredientToAdd = selectedIngredient.value
  const unit = ingredientToAdd ? unitFromIngredient(ingredientToAdd) || 'unité' : ''

  if (headcount === null) return false
  if (!ingredientToAdd) {
    addError.value = "L'ingrédient doit être sélectionné dans la collection."
    return false
  }

  addItem({
    item_type: 'ingredient',
    ingredient_uuid: ingredientToAdd.uuid,
    ingredient_name: ingredientToAdd.name,
    ingredient_quantity: 1,
    ingredient_unit: unit,
    headcount,
    member_ids: memberIdsForNewItem(),
  })
  return true
}

const addWishlistIngredient = (ingredient: Ingredient): void => {
  if (addIngredient(ingredient)) {
    ingredientWishlist.remove(ingredient.uuid)
  }
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
      'meal-slot--empty': !slot.items.length && !collapsed && (!expanded || !slotHeadcount),
      'meal-slot--collapsed': collapsed,
      'meal-slot--expanded': expanded,
      'meal-slot--editable': !readonly,
      'meal-slot--with-indicators': hasSlotIndicators,
      'meal-slot--without-label': showMealLabel === false,
    }"
    :role="readonly || expanded ? undefined : 'button'"
    :tabindex="readonly || expanded ? undefined : 0"
    :aria-label="readonly || expanded ? undefined : `Modifier ${mealLabel} du ${slot.date}`"
    @click="!expanded && openEditorModal()"
    @keydown.enter="!expanded && openEditorModal()"
    @keydown.space.prevent="!expanded && openEditorModal()"
  >
    <header v-if="showMealLabel !== false" class="meal-slot__header">
      <strong>{{ mealLabel }}</strong>
    </header>

    <div v-if="!expanded && hasSlotIndicators" class="meal-slot__indicators">
      <span
        class="meal-slot__planned-count"
        :aria-label="plannedItemCount ? plannedItemLabel : undefined"
        :aria-hidden="plannedItemCount ? undefined : true"
      >
        <template v-if="plannedItemCount">
          <span aria-hidden="true">🍽</span>
          {{ plannedItemCount }}
        </template>
      </span>
      <HouseholdMemberAvatarStack
        v-if="usesNamedMembers"
        :members="slotMembers"
      />
      <span v-else class="meal-slot__headcount-avatars" aria-hidden="true">
        <span v-for="dot in slotAvatarDots" :key="dot"></span>
        <strong v-if="slotRemainingAvatars">+{{ slotRemainingAvatars }}</strong>
      </span>
      <span
        class="meal-slot__headcount-people"
        :aria-label="slotHeadcount ? slotHeadcountLabel : undefined"
        :aria-hidden="slotHeadcount ? undefined : true"
      >
        <template v-if="slotHeadcount">
          <span aria-hidden="true">👤</span>
          {{ slotHeadcount }}
        </template>
      </span>
    </div>

    <section
      v-if="expanded && usesNamedMembers && slotMembers.length"
      class="meal-slot__participants"
      aria-label="Participants du repas"
    >
      <HouseholdMemberPillList
        :members="slotMembers"
        flat
        full-names
      />
    </section>

    <div
      v-else-if="expanded && !usesNamedMembers && slotHeadcount"
      class="meal-slot__participants"
      :aria-label="slotHeadcountLabel"
    >
      <span>{{ slotHeadcountLabel }}</span>
    </div>

    <div v-if="!collapsed && slot.items.length" class="meal-slot__items">
      <MealItemRow
        v-for="item in slot.items"
        :key="item.uuid"
        :item="item"
        :fallback-headcount="slotHeadcount"
        :fallback-member-ids="slotResolvedMemberIds"
        :household-members="householdMembers"
        :uses-named-members="usesNamedMembers"
        :slot-date="slot.date"
        :slot-code="slot.slot_code"
        :readonly="readonly"
        :open-recipe-details="openRecipeDetails"
        @open-recipe="emit('openRecipe', $event)"
      />
    </div>

    <div v-else-if="!collapsed && slotHeadcount" class="meal-slot__empty-state"></div>

    <Teleport to="body">
      <div v-if="isModalOpen" class="meal-slot-modal" @click.self="closeModal" @keydown.esc="closeModal">
        <section
          class="meal-slot-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meal-slot-modal-title"
        >
          <header class="meal-slot-modal__header">
            <div class="meal-slot-modal__title-block">
              <span class="meal-slot-modal__date">
                {{ slotFullDateLabel }}
              </span>
              <h3 id="meal-slot-modal-title">{{ mealLabel }}</h3>
            </div>

            <div class="meal-slot-modal__header-actions">
              <span class="meal-slot-modal__attendance">
                <span aria-hidden="true">♙</span>
                {{ attendanceLabel }}
              </span>
              <button
                type="button"
                class="meal-slot-modal__close"
                title="Fermer"
                aria-label="Fermer"
                @click="closeModal"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>

          <div v-if="!isModalSubviewOpen" class="meal-slot-modal__overview">
            <section class="meal-slot-modal__card meal-slot-modal__people-card" aria-label="À table">
              <header class="meal-slot-modal__card-header">
                <h4>À table</h4>
                <button
                  v-if="hasNamedMemberSection && !readonly"
                  type="button"
                  class="meal-slot-modal__member-edit"
                  @click="openSlotMemberPicker"
                >
                  <span aria-hidden="true">✎</span>
                  Modifier
                </button>
              </header>

              <HouseholdMemberPillList
                v-if="hasNamedMemberSection"
                :members="slotMembers"
                empty-label="Aucun participant"
                :show-age-labels="false"
              />

              <form
                v-else
                class="meal-slot-modal__headcount-row"
                @submit.prevent="saveDefaultHeadcount"
              >
                <label class="meal-slot-modal__field">
                  <span>Nombre de convives</span>
                  <input v-model="headcountInput" type="number" min="1" max="99" inputmode="numeric" />
                </label>
                <button type="submit">Appliquer</button>
              </form>
            </section>

            <section class="meal-slot-modal__card meal-slot-modal__menu-card" aria-label="Menu du repas">
              <header class="meal-slot-modal__card-header">
                <h4>Menu du repas</h4>
                <span class="meal-slot-modal__item-count">
                  <span aria-hidden="true"></span>
                  {{ menuItemCountLabel }}
                </span>
              </header>

              <div class="meal-slot-modal__actions" aria-label="Ajouter un contenu au repas">
                <button
                  v-for="action in mealSlotActions"
                  :key="action.id"
                  type="button"
                  :class="`meal-slot-modal__action--${action.tone}`"
                  :disabled="action.disabled"
                  :aria-label="action.unavailableLabel ?? action.label"
                  :title="action.unavailableLabel"
                  @click="selectAddAction(action.mode)"
                >
                  <span class="meal-slot-modal__action-icon" aria-hidden="true">{{ action.icon }}</span>
                  <span>{{ action.label }}</span>
                </button>
              </div>

              <section class="meal-slot-modal__existing" aria-label="Contenu du repas">
                <div v-if="slot.items.length" class="meal-slot-modal__planned-list">
                  <article
                    v-for="item in slot.items"
                    :key="item.uuid"
                    class="meal-slot-modal__planned-item"
                    :class="{ 'meal-slot-modal__planned-item--active': activeItemUuid === item.uuid }"
                    @click.stop="openItemActions(item)"
                  >
                    <MealItemRow
                      :item="item"
                      :fallback-headcount="slotHeadcount"
                      :fallback-member-ids="slotResolvedMemberIds"
                      :household-members="householdMembers"
                      :uses-named-members="usesNamedMembers"
                      :slot-date="slot.date"
                      :slot-code="slot.slot_code"
                      :readonly="readonly"
                      compact
                    />
                    <div v-if="!readonly" class="meal-slot-modal__item-controls">
                      <button
                        type="button"
                        class="meal-slot-modal__item-menu"
                        :class="{ 'is-active': activeItemUuid === item.uuid }"
                        :aria-label="`Modifier l’élément ${item.position + 1}`"
                        :aria-expanded="activeItemUuid === item.uuid"
                        title="Modifier"
                        @click.stop="openItemActions(item)"
                      >
                        <span aria-hidden="true">✎</span>
                      </button>
                      <button
                        v-if="recipeUuidForItem(item)"
                        type="button"
                        class="meal-slot-modal__item-preview"
                        :aria-label="`Visualiser la recette ${item.recipe_snapshot?.title || ''}`.trim()"
                        title="Visualiser la recette"
                        @click.stop="openRecipePreview(item)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                          <circle cx="12" cy="12" r="2.7" stroke="currentColor" stroke-width="1.7" />
                        </svg>
                      </button>
                    </div>
                  </article>
                </div>
                <p v-else class="meal-slot-modal__empty-menu">Aucun contenu prévu pour ce repas.</p>
              </section>

              <div v-if="activeItem && !readonly" class="meal-slot-modal__item-actions" @click.stop>
                <button type="button" @click="openItemActionMode('move', activeItem)">
                  <span aria-hidden="true">↗</span>
                  Déplacer
                </button>
                <button type="button" @click="addItemToWishlist(activeItem)">
                  <span aria-hidden="true">☆</span>
                  Ajouter à la liste d’envies
                </button>
                <template v-if="usesNamedMembers">
                  <button type="button" @click="openItemActionMode('members', activeItem)">
                    <span aria-hidden="true">👤</span>
                    Participants
                  </button>
                </template>
                <template v-else>
                  <label class="meal-slot-modal__field meal-slot-modal__item-headcount">
                    <span>Personnes</span>
                    <input v-model="itemHeadcountInput" type="number" min="1" max="99" inputmode="numeric" />
                  </label>
                  <button type="button" @click="updateItemHeadcount(activeItem)">
                    <span aria-hidden="true">👤</span>
                    Modifier les personnes
                  </button>
                </template>
                <button type="button" class="meal-slot-modal__danger-action" @click="removeItem(activeItem)">
                  <span aria-hidden="true">🗑</span>
                  Supprimer
                </button>
              </div>
            </section>
          </div>

          <div v-else class="meal-slot-modal__subview">
            <header class="meal-slot-modal__subview-header">
              <button type="button" @click="closeSubview">
                <span aria-hidden="true">←</span>
                Retour
              </button>
              <strong>{{ modalSubviewTitle }}</strong>
            </header>

            <div v-if="activeAddMode === 'recipe'" class="meal-slot-modal__content meal-slot-modal__content--recipe">
              <RecipePicker button-label="Ajouter" @select="addRecipe" />
            </div>

            <div v-else-if="activeAddMode === 'wishlist'" class="meal-slot-modal__content meal-slot-modal__content--recipe">
              <p v-if="wishlist.loading || ingredientWishlist.loading" class="meal-slot-modal__state">Chargement de la liste d’envies...</p>
              <p v-else-if="wishlist.error || ingredientWishlist.error" class="meal-slot-modal__error">{{ wishlist.error || ingredientWishlist.error }}</p>
              <p v-else-if="!wishlist.recipes.length && !ingredientWishlist.ingredients.length" class="meal-slot-modal__state">Aucune recette ni aucun ingrédient dans la liste d’envies.</p>
              <div v-else class="meal-slot-modal__wishlist-grid">
                <article v-for="recipe in wishlist.recipes" :key="recipe.uuid" class="meal-slot-modal__wishlist-card" @click="addWishlistRecipe(recipe)">
                  <img v-if="recipe.main_image" :src="recipe.main_image" :alt="recipe.name" />
                  <span v-else aria-hidden="true">{{ recipe.name.charAt(0).toLocaleUpperCase('fr-FR') }}</span>
                  <strong>{{ recipe.name }}</strong>
                  <small>Recette</small>
                </article>
                <article v-for="ingredient in ingredientWishlist.ingredients" :key="ingredient.uuid" class="meal-slot-modal__wishlist-card" @click="addWishlistIngredient(ingredient)">
                  <img v-if="ingredient.media_profile.main_image_uri" :src="ingredient.media_profile.main_image_uri" :alt="ingredient.name" />
                  <span v-else aria-hidden="true">{{ ingredient.name.charAt(0).toLocaleUpperCase('fr-FR') }}</span>
                  <strong>{{ ingredient.name }}</strong>
                  <small>Ingrédient</small>
                </article>
              </div>
            </div>

            <form
              v-else-if="activeAddMode === 'ingredient'"
              class="meal-slot-modal__form meal-slot-modal__form--ingredient"
              @submit.prevent
            >
              <label class="meal-slot-modal__field">
                <span>Ingrédient</span>
                <IngredientPicker
                  v-model="selectedIngredientUuid"
                  @select="addIngredient"
                />
              </label>
            </form>

            <form v-else-if="activeAddMode === 'note'" class="meal-slot-modal__form" @submit.prevent="addNote">
              <label class="meal-slot-modal__field">
                <span>Note</span>
                <textarea v-model="noteInput" rows="4" required />
              </label>
              <button type="submit" class="meal-slot-modal__submit">Ajouter</button>
            </form>

            <div v-else-if="activeItemActionMode === 'move' && activeItem" class="meal-slot-modal__content">
              <div class="meal-slot-modal__move-scroller">
                <div class="meal-slot-modal__move-grid" :style="{ gridTemplateColumns: moveGridTemplateColumns }">
                  <div class="meal-slot-modal__move-corner" aria-hidden="true"></div>
                  <div
                    v-for="day in moveDateColumns"
                    :key="day.date"
                    class="meal-slot-modal__move-day"
                    :class="{ 'is-source-day': day.date === slot.date }"
                  >
                    <span>{{ day.dayLabel }}</span>
                    <strong>{{ day.dateLabel }}</strong>
                  </div>

                  <template v-for="row in moveSlotRows" :key="row.slot_code">
                    <div class="meal-slot-modal__move-row-head">{{ row.label }}</div>
                    <button
                      v-for="day in moveDateColumns"
                      :key="`${day.date}:${row.slot_code}`"
                      type="button"
                      class="meal-slot-modal__move-cell"
                      :class="{
                        'is-current': isCurrentMoveTarget(day.date, row.slot_code),
                        'is-source-day': day.date === slot.date,
                      }"
                      :disabled="isCurrentMoveTarget(day.date, row.slot_code)"
                      :aria-label="`Déplacer vers ${row.label} du ${day.fullLabel}`"
                      @click="moveItem(activeItem, { date: day.date, slot_code: row.slot_code })"
                    >
                      <span v-if="isCurrentMoveTarget(day.date, row.slot_code)">Actuel</span>
                      <span v-else aria-hidden="true">↗</span>
                    </button>
                  </template>
                </div>
              </div>
            </div>

            <div v-else-if="activeItemActionMode === 'members' && !activeItem" class="meal-slot-modal__content">
              <p v-if="!availableItemMembers.length" class="meal-slot-modal__state">Aucun participant disponible.</p>
              <MemberSelector
                v-else
                :model-value="slotMemberDraftIds"
                :members="availableItemMembers"
                @update:model-value="setSlotMembers"
              />
            </div>

            <div v-else-if="activeItemActionMode === 'members' && activeItem" class="meal-slot-modal__content">
              <p v-if="!availableItemMembers.length" class="meal-slot-modal__state">Aucun participant disponible.</p>
              <MemberSelector
                v-else
                :model-value="itemMemberDraftIds"
                :members="availableItemMembers"
                @update:model-value="setItemMembers(activeItem, $event)"
              />
            </div>
          </div>

          <p v-if="addError" class="meal-slot-modal__error">{{ addError }}</p>
        </section>
      </div>
    </Teleport>

    <PlanningRecipePreviewModal
      v-if="previewRecipe"
      :key="previewRecipe.uuid"
      :uuid="previewRecipe.uuid"
      :fallback-title="previewRecipe.name"
      @close="closeRecipePreview"
    />
  </section>
</template>

<style scoped>
.meal-slot {
  position: relative;
  min-width: 0;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 6px;
  padding: 0;
  background: transparent;
}

.meal-slot:not(.meal-slot--with-indicators) {
  grid-template-rows: auto minmax(0, 1fr);
}

.meal-slot--without-label {
  grid-template-rows: auto minmax(0, 1fr);
}

.meal-slot--without-label:not(.meal-slot--with-indicators) {
  grid-template-rows: minmax(0, 1fr);
}

.meal-slot--collapsed {
  align-items: center;
  padding: 0;
}

.meal-slot--editable {
  cursor: pointer;
}

.meal-slot--expanded {
  height: auto;
  display: block;
  cursor: default;
}

.meal-slot--editable:hover,
.meal-slot--editable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-primary) 52%, transparent);
  outline-offset: -2px;
}

.meal-slot--expanded:hover,
.meal-slot--expanded:focus-visible {
  outline: 0;
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
  --meal-card-min-width: 128px;
  --meal-card-min-height: 152px;

  min-height: 0;
  max-height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(var(--meal-card-min-width), 1fr));
  grid-auto-rows: minmax(var(--meal-card-min-height), auto);
  align-content: start;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-x: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
}

.meal-slot--expanded .meal-slot__items {
  max-height: none;
  grid-template-columns: repeat(auto-fill, minmax(180px, 220px));
  grid-auto-rows: minmax(210px, auto);
  justify-content: start;
  overflow: visible;
  overscroll-behavior: auto;
  scrollbar-gutter: auto;
}

.meal-slot--expanded .meal-slot__items :deep(.meal-item__body) {
  max-height: none;
  overflow: visible;
}

.meal-slot--expanded .meal-slot__items :deep(.meal-item__body strong),
.meal-slot--expanded .meal-slot__items :deep(.meal-item__body span) {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  -webkit-line-clamp: unset;
}

.meal-slot__items :deep(.meal-item) {
  min-width: var(--meal-card-min-width);
  min-height: var(--meal-card-min-height);
}

.meal-slot__indicators {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 22px;
  min-width: 0;
  pointer-events: none;
}

@media (max-width: 520px) {
  .meal-slot--expanded .meal-slot__items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.meal-slot__participants {
  min-width: 0;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.meal-slot__participants > span {
  color: var(--color-text-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.meal-slot__planned-count,
.meal-slot__headcount-people,
.meal-slot__headcount-avatars {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  font-size: 0.72rem;
  font-weight: 750;
  line-height: 1;
}

.meal-slot__planned-count {
  justify-self: start;
  gap: 4px;
  color: var(--color-primary);
}

.meal-slot__headcount-avatars {
  justify-self: center;
  max-width: 92px;
  overflow: hidden;
  padding-left: 5px;
}

.meal-slot__indicators :deep(.member-avatar-stack) {
  justify-self: center;
  max-width: 92px;
  overflow: hidden;
}

.meal-slot__headcount-people {
  justify-self: end;
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
  --meal-page-accent: #668873;
  --meal-page-accent-soft: #edf3ef;
  --meal-page-background: #f4f3ee;
  --meal-page-panel: #fbfbf7;
  --meal-page-border: #dfe2da;
  --meal-page-text: #242a26;
  --meal-page-muted: #7e867f;

  position: fixed;
  inset: 0;
  z-index: 200;
  overflow: auto;
  background: var(--meal-page-background);
}

.meal-slot-modal__panel {
  width: 100%;
  min-height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: start;
  gap: clamp(18px, 3vw, 30px);
  padding: clamp(18px, 3vw, 34px) clamp(18px, 4vw, 48px) 44px;
  border: 0;
  background: var(--meal-page-background);
}

.meal-slot-modal__header {
  width: min(1220px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 52px;
}

.meal-slot-modal__header h3 {
  margin: 0;
  color: var(--meal-page-text);
  font-size: clamp(1.45rem, 2.3vw, 2rem);
  font-weight: 720;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.meal-slot-modal__close {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0;
  border-color: var(--meal-page-border) !important;
  border-radius: 12px !important;
  background: var(--meal-page-panel) !important;
  color: #59635c !important;
  box-shadow: 0 2px 8px rgba(52, 64, 56, 0.035);
}

.meal-slot-modal__close span {
  font-size: 1.55rem;
  font-weight: 400;
  line-height: 1;
}

.meal-slot-modal__title-block {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.meal-slot-modal__date {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--meal-page-muted);
  font-size: 0.64rem;
  font-weight: 760;
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
}

.meal-slot-modal__header-actions {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 18px;
}

.meal-slot-modal__attendance {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #5f6962;
  font-size: 0.82rem;
  font-weight: 650;
}

.meal-slot-modal__close:hover,
.meal-slot-modal__close:focus-visible {
  border-color: color-mix(in srgb, var(--meal-page-accent) 34%, var(--meal-page-border)) !important;
  color: var(--meal-page-text) !important;
}

.meal-slot-modal__overview,
.meal-slot-modal__subview,
.meal-slot-modal__error {
  width: min(1220px, 100%);
  margin-inline: auto;
}

.meal-slot-modal__card {
  min-width: 0;
  align-self: start;
  padding: clamp(18px, 2.4vw, 28px);
  border: 1px solid var(--meal-page-border);
  border-radius: 22px;
  background: var(--meal-page-panel);
  box-shadow: 0 14px 30px rgba(49, 62, 53, 0.055);
}

.meal-slot-modal__overview,
.meal-slot-modal__subview {
  min-height: 0;
  display: grid;
  gap: 18px;
}

.meal-slot-modal__overview {
  grid-template-columns: minmax(280px, 0.72fr) minmax(520px, 1.55fr);
  align-items: start;
}

.meal-slot-modal__subview {
  align-self: start;
  max-height: calc(100vh - 130px);
  grid-template-rows: auto auto;
  align-content: start;
  padding: clamp(14px, 1.8vw, 20px);
  border: 1px solid var(--meal-page-border);
  border-radius: 22px;
  background: var(--meal-page-panel);
  box-shadow: 0 14px 30px rgba(49, 62, 53, 0.055);
}

.meal-slot-modal__people-card,
.meal-slot-modal__menu-card {
  display: grid;
  gap: 18px;
}

.meal-slot-modal__card-header {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.meal-slot-modal__card-header h4 {
  margin: 0;
  color: var(--meal-page-text);
  font-size: clamp(1.12rem, 1.65vw, 1.42rem);
  font-weight: 700;
  letter-spacing: -0.025em;
}

.meal-slot-modal__member-edit {
  min-height: 34px;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-color: var(--meal-page-border) !important;
  border-radius: 9px !important;
  background: transparent !important;
  color: #59665e !important;
  font-size: 0.78rem !important;
  font-weight: 650 !important;
}

.meal-slot-modal__item-count {
  min-height: 25px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f0f3ed;
  color: #747e76;
  font-size: 0.7rem;
  font-weight: 650;
  white-space: nowrap;
}

.meal-slot-modal__item-count > span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--meal-page-accent);
}

.meal-slot-modal__people-card :deep(.member-pill-list) {
  gap: 14px;
}

.meal-slot-modal__people-card :deep(.member-pill-list__type) {
  gap: 8px;
  padding-top: 2px;
}

.meal-slot-modal__people-card :deep(.member-pill-list__type + .member-pill-list__type) {
  padding-top: 15px;
  border-top: 1px solid var(--meal-page-border);
}

.meal-slot-modal__people-card :deep(.member-pill-list__type > header strong),
.meal-slot-modal__people-card :deep(.member-pill-list__age-label) {
  color: #68726a;
  font-size: 0.68rem;
  letter-spacing: 0.01em;
  text-transform: none;
}

.meal-slot-modal__people-card :deep(.member-pill-list__type > header > span) {
  background: #f0f1ed;
  color: #858d87;
}

.meal-slot-modal__people-card :deep(.member-pill-list__ages) {
  gap: 8px;
  padding-left: 0;
  border-left: 0;
}

.meal-slot-modal__people-card :deep(.member-pill-list__age) {
  grid-template-columns: 1fr;
  gap: 5px;
}

.meal-slot-modal__people-card :deep(.member-pill-list__pill) {
  font-size: 0.72rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.meal-slot-modal__subview-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meal-slot-modal__subview-header button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-color: var(--meal-page-border);
  color: #59665e;
}

.meal-slot-modal__subview-header strong {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 0.92rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-slot-modal__existing {
  display: grid;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid var(--meal-page-border);
}

.meal-slot-modal__existing p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.meal-slot-modal__planned-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(72px, auto);
  gap: 10px;
}

.meal-slot-modal__planned-item {
  position: relative;
  min-width: 0;
  min-height: 0;
  cursor: pointer;
  border-radius: 10px;
}

.meal-slot-modal__planned-item--active {
  outline: 2px solid var(--meal-page-accent);
  outline-offset: 2px;
}

.meal-slot-modal__planned-item :deep(.meal-item) {
  height: 100%;
}

.meal-slot-modal__item-controls {
  position: absolute;
  top: 9px;
  right: 9px;
  z-index: 2;
  display: grid;
  gap: 4px;
}

.meal-slot-modal__item-menu,
.meal-slot-modal__item-preview {
  width: 28px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0 !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: #879089 !important;
  font-size: 1rem !important;
  letter-spacing: 0.03em;
  line-height: 1;
}

.meal-slot-modal__item-preview svg {
  width: 16px;
  height: 16px;
}

.meal-slot-modal__item-menu:hover,
.meal-slot-modal__item-menu:focus-visible,
.meal-slot-modal__item-menu.is-active,
.meal-slot-modal__item-preview:hover,
.meal-slot-modal__item-preview:focus-visible {
  background: #eef1ec !important;
  color: #526159 !important;
}

.meal-slot-modal__empty-menu {
  min-height: 116px;
  display: grid;
  place-items: center;
  padding: 24px;
  border: 1px dashed var(--meal-page-border);
  border-radius: 12px;
  color: var(--meal-page-muted) !important;
  text-align: center;
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
  gap: 10px;
  align-items: end;
}

.meal-slot-modal__headcount-row button {
  min-height: 36px;
  padding: 6px 12px;
  border-color: var(--meal-page-border);
  color: #59665e;
}

.meal-slot-modal__actions {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.meal-slot-modal__actions button {
  min-width: 0;
  min-height: 48px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-color: var(--meal-page-border);
  border-radius: 9px;
  background: #fffefb;
  color: #4d5750;
  font-size: 0.7rem;
  font-weight: 650;
  text-align: left;
}

.meal-slot-modal__actions button > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-slot-modal__action-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  font-size: 0.95rem;
  font-weight: 750;
  line-height: 1;
}

.meal-slot-modal__action--sage .meal-slot-modal__action-icon {
  background: #e7f0ea;
  color: #5f7e6b;
}

.meal-slot-modal__action--rose .meal-slot-modal__action-icon {
  background: #f7e9ee;
  color: #b16f87;
}

.meal-slot-modal__action--amber .meal-slot-modal__action-icon {
  background: #f8eddd;
  color: #ae7839;
}

.meal-slot-modal__action--sky .meal-slot-modal__action-icon {
  background: #e8f0f4;
  color: #688594;
}

.meal-slot-modal__action--muted .meal-slot-modal__action-icon {
  background: #efefec;
  color: #a0a49f;
}

.meal-slot-modal__actions button:disabled {
  background: #f7f7f3;
  color: #a4a8a4;
  cursor: not-allowed;
  opacity: 0.74;
}

.meal-slot-modal__content,
.meal-slot-modal__form {
  min-height: 0;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  display: grid;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 10px;
}

.meal-slot-modal__content :deep(.member-selector) {
  align-self: start;
  align-content: start;
}

.meal-slot-modal__content :deep(.member-selector__pills button) {
  height: auto;
  min-height: 34px;
  align-self: start;
}

.meal-slot-modal__form--ingredient {
  height: 100%;
  overflow: hidden;
}

.meal-slot-modal__form--ingredient .meal-slot-modal__field {
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
}

.meal-slot-modal__content--recipe {
  min-height: 0;
}

.meal-slot-modal__field {
  display: grid;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.meal-slot-modal__field input,
.meal-slot-modal__field textarea,
.meal-slot-modal__field select {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 0.92rem;
}

.meal-slot-modal__field input:focus,
.meal-slot-modal__field textarea:focus,
.meal-slot-modal__field select:focus {
  border-color: var(--meal-page-accent);
}

.meal-slot-modal__field input,
.meal-slot-modal__field select {
  min-height: 34px;
  padding: 6px 8px;
}

.meal-slot-modal__field input[readonly] {
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
}

.meal-slot-modal__field textarea {
  min-height: 120px;
  max-height: 240px;
  resize: vertical;
  padding: 8px;
}

.meal-slot-modal__inline-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.meal-slot-modal__submit {
  height: auto;
  min-height: 34px;
  padding: 6px 10px;
  justify-self: end;
  border-color: var(--meal-page-accent);
  color: white;
  background: var(--meal-page-accent);
}

.meal-slot-modal__error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.84rem;
}

.meal-slot-modal__state {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 650;
}

.meal-slot-modal__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--meal-page-border);
  border-radius: 10px;
  background: #f1f3ef;
}

.meal-slot-modal__item-actions button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  white-space: nowrap;
}

.meal-slot-modal__item-headcount {
  width: min(150px, 100%);
}

.meal-slot-modal__danger-action {
  border-color: color-mix(in srgb, var(--color-danger) 28%, var(--color-border)) !important;
  color: var(--color-danger) !important;
}

.meal-slot-modal__target-grid {
  max-height: min(58vh, 560px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  overflow-y: auto;
  padding: 2px 4px 4px 2px;
}

.meal-slot-modal__target-grid button {
  min-height: 42px;
  padding: 8px 10px;
  text-align: left;
}

.meal-slot-modal__move-scroller {
  max-height: min(58vh, 560px);
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.meal-slot-modal__move-grid {
  display: grid;
  gap: 1px;
  min-width: max-content;
}

.meal-slot-modal__move-corner,
.meal-slot-modal__move-day,
.meal-slot-modal__move-row-head,
.meal-slot-modal__move-cell {
  background: var(--color-surface);
}

.meal-slot-modal__move-corner,
.meal-slot-modal__move-day {
  position: sticky;
  top: 0;
  z-index: 2;
}

.meal-slot-modal__move-corner {
  left: 0;
  z-index: 4;
}

.meal-slot-modal__move-day {
  min-height: 48px;
  display: grid;
  gap: 1px;
  align-content: center;
  justify-items: center;
  padding: 6px;
  text-transform: capitalize;
}

.meal-slot-modal__move-day span {
  color: var(--color-text-secondary);
  font-size: 0.76rem;
  font-weight: 650;
}

.meal-slot-modal__move-day strong {
  font-size: 0.84rem;
  font-weight: 760;
}

.meal-slot-modal__move-row-head {
  position: sticky;
  left: 0;
  z-index: 1;
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 7px 8px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 740;
}

.meal-slot-modal__move-cell {
  min-height: 44px;
  display: grid;
  place-items: center;
  border: 0 !important;
  border-radius: 0 !important;
  background: var(--color-surface) !important;
  color: var(--color-primary) !important;
  font-weight: 780 !important;
}

.meal-slot-modal__move-day.is-source-day,
.meal-slot-modal__move-cell.is-source-day {
  background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface)) !important;
}

.meal-slot-modal__move-cell.is-current {
  color: var(--color-text-tertiary) !important;
  background: var(--color-surface-muted) !important;
  cursor: default;
}

.meal-slot-modal__move-cell:focus-visible {
  position: relative;
  z-index: 3;
  outline: 2px solid var(--color-focus);
  outline-offset: -2px;
}

.meal-slot-modal__wishlist-grid {
  max-height: min(48vh, 460px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding: 2px 4px 4px 2px;
}

.meal-slot-modal__wishlist-card {
  min-width: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: minmax(112px, 1fr) auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}

.meal-slot-modal__wishlist-card img,
.meal-slot-modal__wishlist-card > span {
  width: 100%;
  height: 100%;
  min-height: 112px;
  display: grid;
  place-items: center;
  object-fit: cover;
  background: var(--color-surface-muted);
  color: var(--color-text-tertiary);
  font-size: 2.2rem;
  font-weight: 800;
}

.meal-slot-modal__wishlist-card strong {
  overflow: hidden;
  padding: 9px 10px;
  color: var(--color-text-primary);
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-slot-modal__wishlist-card small {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
}

@media (max-width: 980px) {
  .meal-slot-modal__overview {
    grid-template-columns: 1fr;
  }

  .meal-slot-modal__people-card :deep(.member-pill-list__age) {
    grid-template-columns: 76px minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .meal-slot-modal__panel {
    gap: 18px;
    padding: 16px 14px 28px;
  }

  .meal-slot-modal__header {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }

  .meal-slot-modal__close {
    width: 42px;
    height: 42px;
  }

  .meal-slot-modal__header-actions {
    justify-self: end;
    gap: 8px;
  }

  .meal-slot-modal__attendance {
    font-size: 0.76rem;
  }

  .meal-slot-modal__card,
  .meal-slot-modal__subview {
    padding: 17px;
    border-radius: 16px;
  }

  .meal-slot-modal__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: visible;
    padding-bottom: 0;
  }

  .meal-slot-modal__actions button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .meal-slot-modal__planned-list,
  .meal-slot-modal__inline-fields,
  .meal-slot-modal__headcount-row {
    grid-template-columns: 1fr;
  }

  .meal-slot-modal__headcount-row button {
    justify-self: start;
  }
}

@media (max-width: 520px) {
  .meal-slot__items {
    grid-template-columns: 1fr;
  }

  .meal-slot-modal__people-card :deep(.member-pill-list__age) {
    grid-template-columns: 1fr;
  }

  .meal-slot-modal__card-header {
    align-items: flex-start;
  }

  .meal-slot-modal__item-actions {
    align-items: stretch;
  }

  .meal-slot-modal__item-actions button {
    flex: 1 1 100%;
  }
}

@media (max-width: 340px) {
  .meal-slot-modal__actions {
    grid-template-columns: 1fr;
  }

  .meal-slot-modal__actions button:last-child:nth-child(odd) {
    grid-column: auto;
  }
}
</style>
