<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HouseholdMemberAvatarStack from '@/components/planning/HouseholdMemberAvatarStack.vue'
import { membersForIds } from '@/components/planning/memberDisplay'
import { ingredientService } from '@/services/ingredientService'
import { recipeService } from '@/services/recipeService'
import { useIngredientCatalogStore } from '@/stores/ingredientCatalogStore'
import { useRecipeCatalogStore } from '@/stores/recipeCatalogStore'
import type { HouseholdMember } from '@/types/householdMember'
import type { MealItem, MealPreparationOpenRequest, SlotCode } from '@/types/mealPlan'
import type { Ingredient, Recipe } from '@/types/recipe'
import { countryFlagFrom } from '@/utils/countryFlags'
import { ingredientDisplayMediaProfile, ingredientHasDisplayImage } from '@/utils/ingredientImagePreview'
import { mediaCardImageUrl } from '@/utils/mediaUrls'

const recipeCache = new Map<string, Recipe | null>()
const recipeRequests = new Map<string, Promise<Recipe | null>>()
const ingredientCache = new Map<string, Ingredient | null>()
const ingredientRequests = new Map<string, Promise<Ingredient | null>>()

const loadRecipe = async (uuid: string, options: { refreshIfMissingImage?: boolean } = {}): Promise<Recipe | null> => {
  if (recipeCache.has(uuid)) {
    const cachedRecipe = recipeCache.get(uuid) ?? null
    if (!options.refreshIfMissingImage || cachedRecipe?.main_image) return cachedRecipe
  }
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

const loadIngredient = async (
  uuid: string,
  options: { refreshIfMissingImage?: boolean } = {},
): Promise<Ingredient | null> => {
  if (ingredientCache.has(uuid)) {
    const cachedIngredient = ingredientCache.get(uuid) ?? null
    if (!options.refreshIfMissingImage || (cachedIngredient && ingredientHasDisplayImage(cachedIngredient))) {
      return cachedIngredient
    }
  }
  const existingRequest = ingredientRequests.get(uuid)
  if (existingRequest) return existingRequest

  const request = ingredientService.getByUuid(uuid)
    .then((ingredient) => {
      ingredientCache.set(uuid, ingredient)
      return ingredient
    })
    .catch(() => {
      ingredientCache.set(uuid, null)
      return null
    })
    .finally(() => {
      ingredientRequests.delete(uuid)
    })

  ingredientRequests.set(uuid, request)
  return request
}

const props = withDefaults(defineProps<{
  item: MealItem
  fallbackHeadcount?: number | null
  fallbackMemberIds?: string[]
  householdMembers?: HouseholdMember[]
  usesNamedMembers?: boolean
  slotDate: string
  slotCode: SlotCode
  readonly?: boolean
  openRecipeDetails?: boolean
  compact?: boolean
}>(), {
  compact: false,
})

const emit = defineEmits<{
  openRecipe: [request: MealPreparationOpenRequest]
}>()

const recipeCatalog = useRecipeCatalogStore()
const ingredientCatalog = useIngredientCatalogStore()
const recipeDetails = ref<Recipe | null>(null)
const ingredientDetails = ref<Ingredient | null>(null)

const recipeUuid = computed(() => props.item.recipe_uuid ?? props.item.recipe_snapshot?.recipe_uuid ?? null)
const ingredientUuid = computed(() => props.item.ingredient_uuid ?? null)
const catalogRecipe = computed(() => (
  recipeUuid.value ? recipeCatalog.recipesByUuid.get(recipeUuid.value) ?? null : null
))
const catalogIngredient = computed(() => (
  ingredientUuid.value
    ? ingredientCatalog.ingredients.find((ingredient) => ingredient.uuid === ingredientUuid.value) ?? null
    : null
))
const resolvedRecipe = computed(() => recipeDetails.value ?? catalogRecipe.value)
const resolvedIngredient = computed(() => ingredientDetails.value ?? catalogIngredient.value)
const thumbnailUri = computed(() => {
  if (props.item.item_type === 'recipe') {
    return mediaCardImageUrl(resolvedRecipe.value?.main_image)
  }
  if (props.item.item_type === 'ingredient' && resolvedIngredient.value) {
    return mediaCardImageUrl(
      ingredientDisplayMediaProfile(resolvedIngredient.value).main_image_uri,
    )
  }
  return null
})
const namedMemberIds = computed(() => {
  if (!props.usesNamedMembers) return []
  const itemMemberIds = props.item.member_ids ?? []
  return itemMemberIds.length ? itemMemberIds : (props.fallbackMemberIds ?? [])
})
const namedMembers = computed(() => membersForIds(namedMemberIds.value, props.householdMembers ?? []))
const effectiveHeadcount = computed(() => (
  props.usesNamedMembers
    ? namedMembers.value.length || null
    : props.item.headcount ?? props.fallbackHeadcount ?? null
))
const isRecipeItem = computed(() => props.item.item_type === 'recipe')
const canOpenRecipe = computed(() => Boolean(props.openRecipeDetails && recipeUuid.value))
const isNoteItem = computed(() => props.item.item_type === 'note')
const itemUsesParticipants = computed(() => props.item.item_type === 'recipe' || props.item.item_type === 'ingredient')
const avatarDots = computed(() => Array.from({ length: Math.min(effectiveHeadcount.value ?? 0, 4) }, (_, index) => index))
const remainingAvatars = computed(() => Math.max((effectiveHeadcount.value ?? 0) - avatarDots.value.length, 0))
const recipeOriginLabel = computed(() => resolvedRecipe.value?.origin_country?.trim() || '')
const recipeOriginFlag = computed(() => countryFlagFrom(recipeOriginLabel.value))
const participantsLabel = computed(() => {
  if (props.usesNamedMembers && namedMembers.value.length) {
    return namedMembers.value.map((member) => member.name).join(', ')
  }
  const headcount = effectiveHeadcount.value
  if (!headcount) return '? personnes'
  return `${headcount} personne${headcount > 1 ? 's' : ''}`
})

const title = computed(() => {
  if (props.item.item_type === 'recipe') return props.item.recipe_snapshot?.title || 'Recette'
  if (props.item.item_type === 'ingredient') return props.item.ingredient_name || 'Ingrédient'
  if (props.item.item_type === 'prep_task') return 'Préparation'
  if (props.item.item_type === 'mixed') return 'Ancien système'
  return 'Note'
})

const itemTypeLabel = computed(() => {
  if (props.item.item_type === 'recipe') return 'Recette'
  if (props.item.item_type === 'ingredient') return 'Ingrédient'
  if (props.item.item_type === 'prep_task') return 'Préparation'
  if (props.item.item_type === 'mixed') return 'Ancien système'
  return 'Note'
})

const thumbnailInitial = computed(() => title.value.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'R')
const thumbnailFallback = computed(() => {
  if (!props.compact) return thumbnailInitial.value
  if (props.item.item_type === 'recipe') return '▤'
  if (props.item.item_type === 'ingredient') return '⌁'
  if (props.item.item_type === 'prep_task') return '↗'
  if (props.item.item_type === 'note') return '▧'
  return '+'
})
const showThumbnail = computed(() => !isNoteItem.value || props.compact)
const durationLabel = computed(() =>
  props.item.recipe_snapshot?.total_duration_min ? `${props.item.recipe_snapshot.total_duration_min} min` : '',
)

const detail = computed(() => {
  if (props.item.note) return props.item.note
  return ''
})

const openRecipe = (event: Event): void => {
  if (!canOpenRecipe.value || !recipeUuid.value) return
  event.preventDefault()
  event.stopPropagation()
  emit('openRecipe', {
    item: props.item,
    uuid: recipeUuid.value,
    recipe_uuid: recipeUuid.value,
    name: title.value,
    slot_date: props.slotDate,
    slot_code: props.slotCode,
    fallback_member_ids: props.fallbackMemberIds ?? [],
    fallback_headcount: props.fallbackHeadcount ?? null,
  })
}

watch(recipeUuid, async (uuid) => {
  recipeDetails.value = null
  if (!uuid) return
  recipeCatalog.hydrateFromStorage()
  recipeCatalog.warmup()
  if (catalogRecipe.value?.main_image) return

  const recipe = await loadRecipe(uuid, { refreshIfMissingImage: true })
  if (recipeUuid.value === uuid) {
    recipeDetails.value = recipe
  }
}, { immediate: true })

watch(ingredientUuid, async (uuid) => {
  ingredientDetails.value = null
  if (!uuid) return
  ingredientCatalog.hydrateFromStorage()
  ingredientCatalog.warmup()
  if (catalogIngredient.value && ingredientHasDisplayImage(catalogIngredient.value)) return

  const ingredient = await loadIngredient(uuid, { refreshIfMissingImage: true })
  if (ingredientUuid.value === uuid) {
    ingredientDetails.value = ingredient
  }
}, { immediate: true })
</script>

<template>
  <article
    class="meal-item"
    :class="[
      {
        'meal-item--note': isNoteItem,
        'meal-item--openable': canOpenRecipe,
        'meal-item--compact': compact,
      },
      compact ? `meal-item--${item.item_type}` : null,
    ]"
    :role="canOpenRecipe ? 'button' : undefined"
    :tabindex="canOpenRecipe ? 0 : undefined"
    :aria-label="canOpenRecipe ? `Ouvrir la recette ${title}` : undefined"
    @click="openRecipe"
    @keydown.enter="openRecipe"
    @keydown.space="openRecipe"
  >
    <div v-if="showThumbnail" class="meal-item__thumbnail" aria-hidden="true">
      <img v-if="thumbnailUri" :src="thumbnailUri" :alt="title" />
      <span v-else>{{ thumbnailFallback }}</span>
      <span
        v-if="isRecipeItem && recipeOriginFlag"
        class="meal-item__badge meal-item__badge--origin"
        :title="recipeOriginLabel"
      >
        {{ recipeOriginFlag }}
      </span>
      <span
        v-if="isRecipeItem && resolvedRecipe?.favorite"
        class="meal-item__badge meal-item__badge--favorite"
        title="Favori"
      >
        ★
      </span>
    </div>

    <div class="meal-item__body">
      <span v-if="compact && !isNoteItem" class="meal-item__eyebrow">{{ itemTypeLabel }}</span>
      <strong v-if="!isNoteItem" :title="title">{{ title }}</strong>
      <span v-if="detail" :class="{ 'meal-item__note-copy': isNoteItem }">{{ detail }}</span>
    </div>

    <div v-if="itemUsesParticipants" class="meal-item__participants" :aria-label="participantsLabel">
      <span class="meal-item__people">
        <span aria-hidden="true">👤</span>
        {{ effectiveHeadcount ?? '?' }}
      </span>
      <span v-if="durationLabel" class="meal-item__duration">{{ durationLabel }}</span>
      <HouseholdMemberAvatarStack
        v-if="usesNamedMembers"
        :members="namedMembers"
      />
      <span v-else-if="avatarDots.length" class="meal-item__avatars" aria-hidden="true">
        <span v-for="dot in avatarDots" :key="dot"></span>
        <strong v-if="remainingAvatars">+{{ remainingAvatars }}</strong>
      </span>
    </div>
  </article>
</template>

<style scoped>
.meal-item {
  position: relative;
  min-width: var(--meal-card-min-width, 128px);
  min-height: var(--meal-card-min-height, 152px);
  overflow: hidden;
  display: grid;
  grid-template-rows: minmax(64px, 1fr) auto auto;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.meal-item--note {
  isolation: isolate;
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  padding: 18px 18px 22px;
  border: 0;
  border-radius: 2px;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.42), transparent 34%),
    repeating-linear-gradient(0deg, rgba(101, 75, 8, 0.018) 0 1px, transparent 1px 4px),
    #ffed78;
  box-shadow:
    0 2px 3px rgba(79, 61, 10, 0.2),
    0 14px 24px rgba(79, 61, 10, 0.18);
  transform: rotate(-0.65deg);
  transform-origin: 50% 48%;
}

.meal-item--note::before {
  content: "";
  position: absolute;
  z-index: 0;
  inset: 0;
  background: linear-gradient(90deg, rgba(111, 83, 9, 0.045), transparent 12%, transparent 88%, rgba(111, 83, 9, 0.025));
  pointer-events: none;
}

.meal-item--openable {
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.meal-item--openable:hover,
.meal-item--openable:focus-visible {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.meal-item--openable:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.meal-item--note::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: 30px;
  height: 30px;
  border-top: 1px solid rgba(93, 68, 6, 0.18);
  border-left: 1px solid rgba(93, 68, 6, 0.12);
  background: linear-gradient(135deg, #e3c84f 0%, #f8de6f 52%, rgba(255, 237, 120, 0) 54%);
  filter: drop-shadow(-2px -2px 2px rgba(88, 67, 10, 0.08));
  pointer-events: none;
}

.meal-item__thumbnail {
  position: relative;
  min-height: 64px;
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

.meal-item__badge {
  position: absolute;
  top: 5px;
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--color-border) 58%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  color: var(--color-primary);
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  pointer-events: none;
}

.meal-item__badge--origin {
  left: 5px;
}

.meal-item__badge--favorite {
  right: 5px;
  color: #f5a623;
}

.meal-item__body {
  min-width: 0;
  min-height: 1.94rem;
  max-height: 2.72rem;
  overflow: hidden;
  display: grid;
  gap: 1px;
  align-content: start;
}

.meal-item__body strong,
.meal-item__body span {
  overflow-wrap: anywhere;
}

.meal-item__body strong {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.18;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meal-item__body span {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-item--note .meal-item__body {
  position: relative;
  z-index: 1;
  min-height: 0;
  max-height: none;
  gap: 0;
  overflow: hidden;
}

.meal-item--note .meal-item__note-copy {
  display: -webkit-box;
  overflow: hidden;
  color: #17130b;
  font-family: "Segoe Print", "Bradley Hand", "Comic Sans MS", "URW Chancery L", "Apple Chancery", cursive;
  font-size: clamp(1.05rem, 1.9vw, 1.32rem);
  font-weight: 800;
  letter-spacing: 0.018em;
  line-height: 1.38;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 8;
}

.meal-item__participants {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.meal-item__people {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 700;
}

.meal-item__duration {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 650;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.meal-item--compact {
  --meal-card-min-width: 0;
  --meal-card-min-height: 72px;

  min-width: 0;
  min-height: 72px;
  grid-template-columns: 68px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  column-gap: 12px;
  row-gap: 4px;
  padding: 7px;
  border-radius: 10px;
  background: #fffefb;
  box-shadow: 0 1px 0 rgba(43, 52, 45, 0.02);
}

.meal-item--compact.meal-item--note {
  border: 1px solid #ddc657;
  border-radius: 6px;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.34), transparent 36%),
    #fff0a0;
  box-shadow: 0 3px 8px rgba(79, 61, 10, 0.12);
  transform: none;
}

.meal-item--compact.meal-item--note::after {
  display: none;
}

.meal-item--compact .meal-item__thumbnail {
  grid-column: 1;
  grid-row: 1 / span 2;
  width: 68px;
  min-height: 58px;
  border-radius: 8px;
  background: #edf4ef;
  color: #638170;
  font-size: 1.15rem;
}

.meal-item--compact.meal-item--ingredient .meal-item__thumbnail {
  background: #f8eddd;
  color: #b9813f;
}

.meal-item--compact.meal-item--note .meal-item__thumbnail,
.meal-item--compact.meal-item--prep_task .meal-item__thumbnail {
  background: #eaf2f5;
  color: #668795;
}

.meal-item--compact.meal-item--note .meal-item__thumbnail {
  background: #efd765;
  color: #3f330d;
}

.meal-item--compact .meal-item__badge {
  display: none;
}

.meal-item--compact .meal-item__body {
  grid-column: 2;
  grid-row: 1;
  min-height: 0;
  max-height: none;
  align-content: center;
  gap: 3px;
  padding-right: 30px;
}

.meal-item--compact .meal-item__eyebrow,
.meal-item--compact.meal-item--note .meal-item__eyebrow {
  display: block;
  overflow: hidden;
  color: #8c948e;
  font-size: 0.55rem;
  font-weight: 760;
  letter-spacing: 0.11em;
  line-height: 1.1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.meal-item--compact .meal-item__body strong,
.meal-item--compact.meal-item--note .meal-item__body strong {
  color: #252b27;
  font-size: 0.82rem;
  font-weight: 720;
  line-height: 1.2;
  -webkit-line-clamp: 1;
}

.meal-item--compact .meal-item__body > span:not(.meal-item__eyebrow) {
  display: none;
}

.meal-item--compact.meal-item--note .meal-item__body > .meal-item__note-copy {
  display: -webkit-box;
  color: #17130b;
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.25;
  -webkit-line-clamp: 2;
}

.meal-item--compact .meal-item__participants {
  grid-column: 2;
  grid-row: 2;
  min-height: 19px;
  justify-content: flex-start;
}

.meal-item--compact .meal-item__participants :deep(.member-avatar-stack) {
  padding-left: 6px;
}

.meal-item--compact .meal-item__people {
  color: #6b756e;
  font-size: 0.68rem;
}

.meal-item--compact .meal-item__duration {
  display: none;
}
</style>
