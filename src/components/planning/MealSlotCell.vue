<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HouseholdMemberAvatarStack from '@/components/planning/HouseholdMemberAvatarStack.vue'
import HouseholdMemberPillList from '@/components/planning/HouseholdMemberPillList.vue'
import IngredientPicker from '@/components/planning/IngredientPicker.vue'
import MealItemRow from '@/components/planning/MealItemRow.vue'
import RecipePicker from '@/components/planning/RecipePicker.vue'
import { formatMealLabel } from '@/components/planning/mealSlotLabels'
import { firstNameFor, initialsFor, membersForIds, textColorFor } from '@/components/planning/memberDisplay'
import { useRecipeWishlistStore } from '@/stores/recipeWishlistStore'
import type { HouseholdMember } from '@/types/householdMember'
import type { MealItem, MealItemPayload, MealSlot, SlotPatchOperation } from '@/types/mealPlan'
import type { Ingredient, Recipe } from '@/types/recipe'

type AddMode = 'recipe' | 'wishlist' | 'ingredient' | 'note'
type ItemActionMode = 'move' | 'members'
type MoveSlotRow = { slot_code: string; label: string }

const props = defineProps<{
  slot: MealSlot
  mealLabel?: string
  showMealLabel?: boolean
  collapsed?: boolean
  readonly?: boolean
  householdMembers?: HouseholdMember[]
  usesNamedMembers?: boolean
  availableSlotRows?: MoveSlotRow[]
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
const moveDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const moveDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })
const moveFullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const isModalOpen = ref(false)
const activeAddMode = ref<AddMode | null>(null)
const activeItemActionMode = ref<ItemActionMode | null>(null)
const activeItemUuid = ref<string | null>(null)
const itemHeadcountInput = ref('')
const headcountInput = ref('')
const noteInput = ref('')
const selectedIngredient = ref<Ingredient | null>(null)
const selectedIngredientUuid = ref('')
const ingredientQuantity = ref('1')
const ingredientUnit = ref('')
const slotMemberDraftIds = ref<string[]>([])
const addError = ref<string | null>(null)
const wishlist = useRecipeWishlistStore()

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
  ingredientQuantity.value = '1'
  ingredientUnit.value = ''
  addError.value = null
}

const openEditorModal = (mode: AddMode | null = null): void => {
  if (props.readonly) return
  activeAddMode.value = mode
  activeItemActionMode.value = null
  activeItemUuid.value = null
  headcountInput.value = defaultHeadcount()
  resetItemForm()
  isModalOpen.value = true
}

const switchMode = (mode: AddMode): void => {
  activeAddMode.value = mode
  activeItemActionMode.value = null
  activeItemUuid.value = null
  resetItemForm()
  if (mode === 'wishlist') {
    void wishlist.loadRecipes()
  }
}

const closeModal = (): void => {
  isModalOpen.value = false
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

const positiveNumberFrom = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
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
  if (!item.recipe_uuid) {
    addError.value = 'Seules les recettes peuvent être ajoutées à la liste d’envies.'
    return
  }
  wishlist.add(item.recipe_uuid)
  activeItemUuid.value = null
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

const isItemMemberSelected = (item: MealItem, memberUuid: string): boolean =>
  memberIdsForItem(item).includes(memberUuid)

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

const toggleItemMember = (item: MealItem, member: HouseholdMember): void => {
  const currentIds = memberIdsForItem(item)
  const nextIds = currentIds.includes(member.uuid)
    ? currentIds.filter((uuid) => uuid !== member.uuid)
    : [...currentIds, member.uuid]
  updateItemMembers(item, nextIds)
}

const isSlotMemberSelected = (memberUuid: string): boolean =>
  slotMemberDraftIds.value.includes(memberUuid)

const updateSlotMembers = (memberIds: string[]): void => {
  addError.value = null
  emit('patch', [{
    op: 'set_members',
    slot_date: props.slot.date,
    slot_code: props.slot.slot_code,
    member_ids: memberIds,
  }])
}

const toggleSlotMember = (member: HouseholdMember): void => {
  const currentIds = slotMemberDraftIds.value
  const nextIds = currentIds.includes(member.uuid)
    ? currentIds.filter((uuid) => uuid !== member.uuid)
    : [...currentIds, member.uuid]
  slotMemberDraftIds.value = nextIds
  updateSlotMembers(nextIds)
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
  ingredientUnit.value = unitFromIngredient(ingredient)
  addError.value = null
}

const addIngredient = (ingredient?: Ingredient): void => {
  if (ingredient) {
    selectIngredient(ingredient)
  }

  const headcount = requiredItemHeadcount()
  const quantity = positiveNumberFrom(ingredientQuantity.value)
  const unit = ingredientUnit.value.trim()
  const ingredientToAdd = selectedIngredient.value

  if (headcount === null) return
  if (!ingredientToAdd) {
    addError.value = "L'ingrédient doit être sélectionné dans la collection."
    return
  }
  if (quantity === null) {
    addError.value = 'La quantité par personne est obligatoire.'
    return
  }
  if (!unit) {
    addError.value = "L'unité doit être définie sur la fiche ingrédient."
    return
  }

  addItem({
    item_type: 'ingredient',
    ingredient_uuid: ingredientToAdd.uuid,
    ingredient_name: ingredientToAdd.name,
    ingredient_quantity: quantity,
    ingredient_unit: unit,
    headcount,
    member_ids: memberIdsForNewItem(),
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
            <h3 id="meal-slot-modal-title">{{ mealLabel }} · {{ slotFullDateLabel }}</h3>
            <div class="meal-slot-modal__header-actions">
              <span class="meal-slot-modal__headcount" :aria-label="slotHeadcountLabel || undefined">
                <template v-if="slotHeadcount">
                  <span aria-hidden="true">👤</span>
                  {{ slotHeadcount }}
                </template>
              </span>
              <button type="button" title="Fermer" @click="closeModal">×</button>
            </div>
          </header>

          <div v-if="!isModalSubviewOpen" class="meal-slot-modal__overview">
            <section v-if="hasNamedMemberSection" class="meal-slot-modal__members" aria-label="Participants">
              <HouseholdMemberPillList
                :members="slotMembers"
                empty-label="Aucun participant"
              />
              <button
                v-if="!readonly"
                type="button"
                class="meal-slot-modal__member-edit"
                @click="openSlotMemberPicker"
              >
                <span aria-hidden="true">👤</span>
                Modifier
              </button>
            </section>

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
                  />
                </article>
              </div>
              <p v-else>Aucun contenu prévu.</p>

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

            <div v-if="!usesNamedMembers" class="meal-slot-modal__headcount-row">
              <label class="meal-slot-modal__field">
                <span>Personnes par défaut</span>
                <input v-model="headcountInput" type="number" min="1" max="99" inputmode="numeric" />
              </label>
              <button type="button" @click="saveDefaultHeadcount">Appliquer</button>
            </div>

            <div class="meal-slot-modal__actions" aria-label="Ajouter un contenu au repas">
              <button type="button" @click="switchMode('recipe')">
                <span aria-hidden="true">🍽</span>
                Recette
              </button>
              <button type="button" @click="switchMode('wishlist')">
                <span aria-hidden="true">☆</span>
                Envies
              </button>
              <button type="button" @click="switchMode('ingredient')">
                <span aria-hidden="true">🥕</span>
                Ingrédient
              </button>
              <button type="button" @click="switchMode('note')">
                <span aria-hidden="true">✎</span>
                Note
              </button>
            </div>
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
              <p v-if="wishlist.loading" class="meal-slot-modal__state">Chargement de la liste d’envies...</p>
              <p v-else-if="wishlist.error" class="meal-slot-modal__error">{{ wishlist.error }}</p>
              <p v-else-if="!wishlist.recipes.length" class="meal-slot-modal__state">Aucune recette dans la liste d’envies.</p>
              <div v-else class="meal-slot-modal__wishlist-grid">
                <article v-for="recipe in wishlist.recipes" :key="recipe.uuid" class="meal-slot-modal__wishlist-card" @click="addWishlistRecipe(recipe)">
                  <img v-if="recipe.main_image" :src="recipe.main_image" :alt="recipe.name" />
                  <span v-else aria-hidden="true">{{ recipe.name.charAt(0).toLocaleUpperCase('fr-FR') }}</span>
                  <strong>{{ recipe.name }}</strong>
                </article>
              </div>
            </div>

            <form v-else-if="activeAddMode === 'ingredient'" class="meal-slot-modal__form" @submit.prevent="addIngredient()">
              <label class="meal-slot-modal__field">
                <span>Ingrédient</span>
                <IngredientPicker
                  v-model="selectedIngredientUuid"
                  @select="addIngredient"
                />
              </label>
              <div class="meal-slot-modal__inline-fields">
                <label class="meal-slot-modal__field">
                  <span>Qté / personne</span>
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
              <div v-else class="meal-slot-modal__member-picker" aria-label="Choisir les participants du repas">
                <button
                  v-for="member in availableItemMembers"
                  :key="member.uuid"
                  type="button"
                  class="meal-slot-modal__member-toggle"
                  :class="{ 'is-selected': isSlotMemberSelected(member.uuid) }"
                  :style="isSlotMemberSelected(member.uuid) ? { backgroundColor: member.color, color: textColorFor(member.color) } : undefined"
                  :aria-pressed="isSlotMemberSelected(member.uuid)"
                  @click="toggleSlotMember(member)"
                >
                  <span class="meal-slot-modal__member-initials">{{ initialsFor(member.name) }}</span>
                  {{ firstNameFor(member.name) }}
                </button>
              </div>
            </div>

            <div v-else-if="activeItemActionMode === 'members' && activeItem" class="meal-slot-modal__content">
              <p v-if="!availableItemMembers.length" class="meal-slot-modal__state">Aucun participant disponible.</p>
              <div v-else class="meal-slot-modal__member-picker" aria-label="Choisir les participants">
                <button
                  v-for="member in availableItemMembers"
                  :key="member.uuid"
                  type="button"
                  class="meal-slot-modal__member-toggle"
                  :class="{ 'is-selected': isItemMemberSelected(activeItem, member.uuid) }"
                  :style="isItemMemberSelected(activeItem, member.uuid) ? { backgroundColor: member.color, color: textColorFor(member.color) } : undefined"
                  :aria-pressed="isItemMemberSelected(activeItem, member.uuid)"
                  @click="toggleItemMember(activeItem, member)"
                >
                  <span class="meal-slot-modal__member-initials">{{ initialsFor(member.name) }}</span>
                  {{ firstNameFor(member.name) }}
                </button>
              </div>
            </div>
          </div>

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
  position: fixed;
  inset: 60px 0 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 10px 18px 18px;
  background: rgba(20, 24, 32, 0.36);
}

.meal-slot-modal__panel {
  width: min(1120px, calc(100vw - 36px));
  height: min(860px, calc(100vh - 88px));
  max-height: calc(100vh - 88px);
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 18px 60px rgba(20, 24, 32, 0.2);
}

.meal-slot-modal__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 32px;
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
  gap: 12px;
}

.meal-slot-modal__header button {
  width: 30px;
  height: 30px;
}

.meal-slot-modal__members {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
}

.meal-slot-modal__members :deep(.member-pill-list) {
  flex: 1;
}

.meal-slot-modal__member-edit {
  min-height: 30px;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  color: var(--color-primary) !important;
}

.meal-slot-modal__overview,
.meal-slot-modal__subview {
  min-height: 0;
  display: grid;
  gap: 10px;
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
  cursor: pointer;
}

.meal-slot-modal__planned-item--active {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
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
  grid-template-columns: repeat(4, 1fr);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
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

.meal-slot-modal__member-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: start;
}

.meal-slot-modal__member-toggle {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 5px;
  border-radius: var(--radius-full) !important;
  background: var(--color-surface);
}

.meal-slot-modal__member-toggle.is-selected {
  border-color: transparent;
}

.meal-slot-modal__member-initials {
  width: 23px;
  height: 23px;
  display: inline-grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-surface) 76%, transparent);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, currentColor 12%, transparent);
  font-size: 0.62rem;
  font-weight: 800;
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

@media (max-width: 520px) {
  .meal-slot-modal {
    padding: 8px;
  }

  .meal-slot-modal__panel {
    width: 100%;
    height: calc(100vh - 76px);
    max-height: calc(100vh - 76px);
  }

  .meal-slot__items,
  .meal-slot-modal__actions,
  .meal-slot-modal__inline-fields,
  .meal-slot-modal__headcount-row,
  .meal-slot-modal__item-actions {
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
