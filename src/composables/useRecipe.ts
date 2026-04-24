import { computed, type Reactive } from 'vue'
import type {
  RecipeCreatePayload,
  RecipeFormData,
  RecipeFormEquipment,
  RecipeFormIngredient,
  RecipeFormSource,
  RecipeFormStep,
} from '@/types/recipe'

const parseNumber = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const compact = (value: string): string => value.trim()

const mapSeasonMonths = (months: number[]): Record<number, number> =>
  months.reduce<Record<number, number>>((acc, month) => {
    acc[month] = 3
    return acc
  }, {})

export function useRecipeValidation(formData: Reactive<RecipeFormData>) {
  const isFormValid = computed(() => {
    const { name, servings, ingredients, steps } = formData
    if (!name.trim() || name.trim().length < 3) return false
    if (!parseNumber(servings) || Number(parseNumber(servings)) < 1) return false

    if (ingredients.length === 0) return false
    const hasInvalidIngredient = ingredients.some(
      (ingredient) =>
        !ingredient.name.trim() ||
        !ingredient.unit.trim() ||
        !parseNumber(ingredient.quantity) ||
        ingredient.seasonMonths.length === 0,
    )
    if (hasInvalidIngredient) return false

    if (steps.length === 0) return false
    return !steps.some(
      (step) =>
        !step.name.trim() ||
        !step.description.trim() ||
        step.description.trim().length < 10,
    )
  })

  return {
    isFormValid,
  }
}

export function useRecipeFormatter() {
  const normalizeIngredient = (ingredient: RecipeFormIngredient) => ({
    name: compact(ingredient.name),
    quantity: Number(parseNumber(ingredient.quantity)),
    unit: compact(ingredient.unit),
    season_months: mapSeasonMonths(ingredient.seasonMonths),
    rayon: compact(ingredient.rayon) || null,
    group: compact(ingredient.group) || null,
    green_score: parseNumber(ingredient.greenScore),
  })

  const normalizeEquipment = (equipment: RecipeFormEquipment) => ({
    name: compact(equipment.name),
    quantity: parseNumber(equipment.quantity),
  })

  const normalizeSource = (source: RecipeFormSource) => ({
    name: compact(source.name),
    description: compact(source.description) || null,
    uri: compact(source.uri) || null,
  })

  const normalizeStep = (step: RecipeFormStep, rank: number) => ({
    name: compact(step.name),
    description: compact(step.description),
    preparation_time: parseNumber(step.preparationTime),
    cooking_time: parseNumber(step.cookingTime),
    rest_time: parseNumber(step.restTime),
    main_image: null,
    secondary_images: [],
    rank,
  })

  const normalizeFormData = (formData: RecipeFormData): RecipeCreatePayload => ({
    name: compact(formData.name),
    description: compact(formData.description) || null,
    servings: Number(parseNumber(formData.servings)),
    main_image: compact(formData.mainImage) || null,
    secondary_images: formData.secondaryImages
      .split(',')
      .map((item) => compact(item))
      .filter(Boolean),
    ingredients: formData.ingredients.map(normalizeIngredient),
    equipment: formData.equipment
      .filter((item) => compact(item.name))
      .map(normalizeEquipment),
    steps: formData.steps.map((step, index) => normalizeStep(step, index + 1)),
    sources: formData.sources
      .filter((source) => compact(source.name) || compact(source.uri))
      .map(normalizeSource),
  })

  return {
    normalizeFormData,
  }
}
