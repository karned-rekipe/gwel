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

const thumbnailUri = ref<string | null>(null)

const effectiveHeadcount = computed(() => props.item.headcount ?? props.fallbackHeadcount ?? null)
const itemUsesPax = computed(() => props.item.item_type === 'recipe' || props.item.item_type === 'ingredient')
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
const durationLabel = computed(() =>
  props.item.recipe_snapshot?.total_duration_min ? `${props.item.recipe_snapshot.total_duration_min} min` : '',
)

const detail = computed(() => {
  if (props.item.item_type === 'ingredient') {
    const quantity = props.item.ingredient_quantity ?? 0
    const unit = props.item.ingredient_unit ?? ''
    return effectiveHeadcount.value ? `${quantity} ${unit} / pax` : `${quantity} ${unit}`
  }
  if (props.item.note) return props.item.note
  return ''
})

watch(() => props.item.recipe_uuid, async (uuid) => {
  thumbnailUri.value = null
  if (!uuid) return
  const recipe = await loadRecipe(uuid)
  if (props.item.recipe_uuid === uuid) {
    thumbnailUri.value = recipe?.main_image ?? null
  }
}, { immediate: true })
</script>

<template>
  <article class="meal-item">
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
      <span v-if="durationLabel" class="meal-item__duration">{{ durationLabel }}</span>
      <span v-if="avatarDots.length > 1" class="meal-item__avatars" aria-hidden="true">
        <span v-for="dot in avatarDots" :key="dot"></span>
        <strong v-if="remainingAvatars">+{{ remainingAvatars }}</strong>
      </span>
    </div>
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
