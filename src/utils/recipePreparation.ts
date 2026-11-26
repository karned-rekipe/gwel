import type {
  RecipePreparationProgress,
  RecipePreparationTimer,
} from '@/types/mealPlan'
import type { Recipe, RecipeEquipment, RecipeIngredient, RecipeStep } from '@/types/recipe'

export type PreparationTimeKind = 'preparation' | 'cooking' | 'rest'

export const ingredientPreparationId = (ingredient: RecipeIngredient, index: number): string =>
  `ingredient:${ingredient.ingredient_uuid}:${index}`

export const equipmentPreparationId = (equipment: RecipeEquipment, index: number): string =>
  `equipment:${equipment.equipment_uuid}:${index}`

export const stepPreparationId = (step: RecipeStep, index: number): string =>
  `step:${step.uuid ?? `${step.rank}:${index}`}`

export const preparationTimerId = (step: RecipeStep, index: number, kind: PreparationTimeKind): string =>
  `${stepPreparationId(step, index)}:${kind}`

export const assignedServingsFor = (
  itemHeadcount: number | null | undefined,
  memberCount: number,
  fallbackHeadcount: number | null | undefined,
  recipeServings: number | null | undefined,
): number => Math.max(
  1,
  memberCount > 0 ? memberCount : (itemHeadcount ?? fallbackHeadcount ?? recipeServings ?? 1),
)

export const createPreparationProgress = (
  targetServings: number,
  current?: RecipePreparationProgress | null,
): RecipePreparationProgress => ({
  target_servings: current?.target_servings ?? targetServings,
  completed_ingredient_ids: [...(current?.completed_ingredient_ids ?? [])],
  completed_equipment_ids: [...(current?.completed_equipment_ids ?? [])],
  completed_step_ids: [...(current?.completed_step_ids ?? [])],
  timers: (current?.timers ?? []).map((timer) => ({ ...timer })),
})

export const scaleIngredientQuantity = (
  quantity: number,
  recipeServings: number | null | undefined,
  targetServings: number,
): number => {
  const baseServings = Number(recipeServings)
  if (!Number.isFinite(baseServings) || baseServings <= 0) return quantity
  return quantity / baseServings * targetServings
}

const quantityFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export const formatIngredientQuantity = (quantity: number): string => quantityFormatter.format(
  Math.abs(quantity) < 0.000001 ? 0 : quantity,
)

export const remainingTimerSeconds = (
  timer: RecipePreparationTimer,
  nowMs: number = Date.now(),
): number => {
  if (timer.status !== 'running' || !timer.started_at) return timer.remaining_seconds
  const startedAtMs = Date.parse(timer.started_at)
  if (!Number.isFinite(startedAtMs)) return timer.remaining_seconds
  return Math.max(0, timer.remaining_seconds - Math.floor((nowMs - startedAtMs) / 1000))
}

export const ringingTimerSeconds = (
  timer: RecipePreparationTimer,
  nowMs: number = Date.now(),
): number => {
  if (timer.status !== 'ringing' || !timer.ringing_since) return 0
  const ringingSinceMs = Date.parse(timer.ringing_since)
  if (!Number.isFinite(ringingSinceMs)) return 0
  return Math.max(0, Math.floor((nowMs - ringingSinceMs) / 1000))
}

export const timerProgressPercent = (durationSeconds: number, remainingSeconds: number): number => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
  const boundedRemaining = Math.min(durationSeconds, Math.max(0, remainingSeconds))
  return Math.round((durationSeconds - boundedRemaining) / durationSeconds * 1000) / 10
}

export const timerDurationMinutes = (step: RecipeStep, kind: PreparationTimeKind): number => {
  if (kind === 'preparation') return Math.max(0, Number(step.preparation_time ?? 0))
  if (kind === 'cooking') return Math.max(0, Number(step.cooking_time ?? 0))
  return Math.max(0, Number(step.rest_time ?? 0))
}

export const recipePreparationIds = (recipe: Recipe) => ({
  ingredients: recipe.ingredients.map(ingredientPreparationId),
  equipment: recipe.equipment.map(equipmentPreparationId),
  steps: recipe.steps.map(stepPreparationId),
})
