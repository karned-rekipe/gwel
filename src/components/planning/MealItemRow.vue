<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HouseholdMemberAvatarStack from '@/components/planning/HouseholdMemberAvatarStack.vue'
import { membersForIds } from '@/components/planning/memberDisplay'
import { recipeService } from '@/services/recipeService'
import { useRecipeCatalogStore } from '@/stores/recipeCatalogStore'
import type { HouseholdMember } from '@/types/householdMember'
import type { MealItem, SlotCode } from '@/types/mealPlan'
import type { Recipe } from '@/types/recipe'
import { countryFlagFrom } from '@/utils/countryFlags'

const recipeCache = new Map<string, Recipe | null>()
const recipeRequests = new Map<string, Promise<Recipe | null>>()

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

const props = defineProps<{
  item: MealItem
  fallbackHeadcount?: number | null
  fallbackMemberIds?: string[]
  householdMembers?: HouseholdMember[]
  usesNamedMembers?: boolean
  slotDate: string
  slotCode: SlotCode
  readonly?: boolean
}>()

const recipeCatalog = useRecipeCatalogStore()
const recipeDetails = ref<Recipe | null>(null)

const recipeUuid = computed(() => props.item.recipe_uuid ?? props.item.recipe_snapshot?.recipe_uuid ?? null)
const catalogRecipe = computed(() => (
  recipeUuid.value ? recipeCatalog.recipesByUuid.get(recipeUuid.value) ?? null : null
))
const resolvedRecipe = computed(() => catalogRecipe.value ?? recipeDetails.value)
const thumbnailUri = computed(() => resolvedRecipe.value?.main_image ?? null)
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

const thumbnailInitial = computed(() => title.value.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'R')
const durationLabel = computed(() =>
  props.item.recipe_snapshot?.total_duration_min ? `${props.item.recipe_snapshot.total_duration_min} min` : '',
)

const detail = computed(() => {
  if (props.item.note) return props.item.note
  return ''
})

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
</script>

<template>
  <article
    class="meal-item"
    :class="{ 'meal-item--note': isNoteItem }"
  >
    <div v-if="!isNoteItem" class="meal-item__thumbnail" aria-hidden="true">
      <img v-if="thumbnailUri" :src="thumbnailUri" :alt="title" />
      <span v-else>{{ thumbnailInitial }}</span>
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
      <strong :title="title">{{ title }}</strong>
      <span v-if="detail">{{ detail }}</span>
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
  grid-template-rows: auto minmax(0, 1fr);
  gap: 8px;
  padding: 12px 12px 14px;
  border-color: #e3c85d;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0) 34%),
    #fff2a8;
  box-shadow: 0 8px 18px rgba(117, 87, 12, 0.14);
}

.meal-item--note::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 24px;
  height: 24px;
  border-top: 1px solid rgba(117, 87, 12, 0.2);
  border-left: 1px solid rgba(117, 87, 12, 0.12);
  background: linear-gradient(135deg, #f3d96c 0%, #f9e58a 54%, rgba(255, 242, 168, 0) 55%);
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
  min-height: 0;
  max-height: none;
  gap: 6px;
  overflow: hidden;
}

.meal-item--note .meal-item__body strong {
  color: #4f3e06;
  font-size: 0.84rem;
  letter-spacing: 0;
  -webkit-line-clamp: 1;
}

.meal-item--note .meal-item__body span {
  display: -webkit-box;
  overflow: hidden;
  color: #5e4a09;
  font-size: 0.78rem;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
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
</style>
