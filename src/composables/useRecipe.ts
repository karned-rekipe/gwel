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

const hasNumber = (value: string): boolean => {
  const parsed = parseNumber(value)
  return parsed !== null && parsed > 0
}

const hasAnyIngredientInput = (ingredient: RecipeFormIngredient): boolean =>
  Boolean(
    ingredient.ingredientUuid ||
    ingredient.search.trim() ||
    ingredient.quantity.trim() ||
    ingredient.unit.trim(),
  )

const hasAnyEquipmentInput = (equipment: RecipeFormEquipment): boolean =>
  Boolean(equipment.equipmentUuid || equipment.search.trim() || equipment.quantity.trim())

const hasAnyStepInput = (step: RecipeFormStep): boolean =>
  Boolean(
    step.name.trim() ||
    step.description.trim() ||
    step.preparationTime.trim() ||
    step.cookingTime.trim() ||
    step.restTime.trim(),
  )

export function useRecipeValidation(formData: Reactive<RecipeFormData>) {
  const errors = computed<Record<string, string>>(() => {
    const result: Record<string, string> = {}

    if (!formData.name.trim()) {
      result.name = 'Le nom de la recette est obligatoire.'
    }
    if (!hasNumber(formData.servings)) {
      result.servings = 'Le nombre de portions est obligatoire.'
    }

    formData.ingredients.forEach((ingredient, index) => {
      if (!hasAnyIngredientInput(ingredient)) return
      if (!ingredient.ingredientUuid) {
        result[`ingredients.${index}.ingredientUuid`] = 'Choisis un ingrédient.'
      }
      if (!hasNumber(ingredient.quantity)) {
        result[`ingredients.${index}.quantity`] = 'La quantité est obligatoire.'
      }
      if (!ingredient.unit.trim()) {
        result[`ingredients.${index}.unit`] = 'L’unité est obligatoire.'
      }
    })

    formData.equipment.forEach((equipment, index) => {
      if (!hasAnyEquipmentInput(equipment)) return
      if (!equipment.equipmentUuid) {
        result[`equipment.${index}.equipmentUuid`] = 'Choisis un équipement ou vide la ligne.'
      }
      const quantity = parseNumber(equipment.quantity)
      if (equipment.quantity.trim() && (quantity === null || quantity < 0)) {
        result[`equipment.${index}.quantity`] = 'La quantité doit être positive.'
      }
    })

    formData.steps.forEach((step, index) => {
      if (!hasAnyStepInput(step)) return
      if (!step.name.trim()) {
        result[`steps.${index}.name`] = 'Le titre est obligatoire pour créer cette étape.'
      }
    })

    return result
  })

  const isFormValid = computed(() => Object.keys(errors.value).length === 0)

  const firstInvalidFieldId = computed(() => {
    if (errors.value.name) return 'recipe-name'
    if (errors.value.servings) return 'recipe-servings'

    for (const index of formData.ingredients.keys()) {
      if (errors.value[`ingredients.${index}.ingredientUuid`]) return `ingredient-select-${index}`
      if (errors.value[`ingredients.${index}.quantity`]) return `ingredient-quantity-${index}`
      if (errors.value[`ingredients.${index}.unit`]) return `ingredient-unit-${index}`
    }

    for (const index of formData.equipment.keys()) {
      if (errors.value[`equipment.${index}.equipmentUuid`]) return `equipment-select-${index}`
      if (errors.value[`equipment.${index}.quantity`]) return `equipment-quantity-${index}`
    }

    for (const index of formData.steps.keys()) {
      if (errors.value[`steps.${index}.name`]) return `step-name-${index}`
    }

    return null
  })

  return {
    errors,
    firstInvalidFieldId,
    isFormValid,
  }
}

export function useRecipeFormatter() {
  const normalizeIngredient = (ingredient: RecipeFormIngredient) => ({
    ingredient_uuid: ingredient.ingredientUuid,
    quantity: Number(parseNumber(ingredient.quantity)),
    unit: compact(ingredient.unit),
  })

  const normalizeEquipment = (equipment: RecipeFormEquipment) => ({
    equipment_uuid: equipment.equipmentUuid,
    quantity: parseNumber(equipment.quantity) ?? 1,
  })

  const normalizeSource = (source: RecipeFormSource) => ({
    name: compact(source.name),
    description: compact(source.description) || null,
    uri: compact(source.uri) || null,
  })

  const normalizeStep = (step: RecipeFormStep, rank: number) => ({
    name: compact(step.name),
    description: compact(step.description) || null,
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
    origin_country: compact(formData.originCountry) || null,
    servings: Number(parseNumber(formData.servings)),
    difficulty: parseNumber(formData.difficulty),
    price: parseNumber(formData.price),
    main_image: compact(formData.mainImage) || null,
    secondary_images: formData.secondaryImages
      .split(',')
      .map((item) => compact(item))
      .filter(Boolean),
    favorite: formData.favorite,
    tag_uuids: [...formData.tagUuids],
    ingredients: formData.ingredients
      .filter((ingredient) => ingredient.ingredientUuid && ingredient.quantity.trim() && ingredient.unit.trim())
      .map(normalizeIngredient),
    equipment: formData.equipment
      .filter((item) => item.equipmentUuid)
      .map(normalizeEquipment),
    steps: formData.steps
      .filter(hasAnyStepInput)
      .map((step, index) => normalizeStep(step, index + 1)),
    sources: formData.sources
      .filter((source) => compact(source.name) || compact(source.uri))
      .map(normalizeSource),
  })

  return {
    normalizeFormData,
  }
}
