import { computed, type Ref } from 'vue'
import type { RecipeFormData } from '@/types/recipe'

/**
 * Composable pour la logique métier liée aux recettes
 */

export function useRecipeValidation(formData: Ref<RecipeFormData>) {
  /**
   * Vérifie si le formulaire est valide
   */
  const isFormValid = computed(() => {
    const { title, shortDescription, description, ingredients, steps, servings, prepTime, cookTime } = formData.value

    // Vérifications basiques
    if (!title.trim() || title.trim().length < 3) return false
    if (!shortDescription.trim() || shortDescription.trim().length < 10) return false
    if (!description.trim() || description.trim().length < 20) return false

    // Vérifications des ingrédients
    if (ingredients.length === 0) return false
    const hasInvalidIngredient = ingredients.some(
      (ing) => !ing.name.trim() || !ing.quantity.trim() || !ing.unit.trim()
    )
    if (hasInvalidIngredient) return false

    // Vérifications des étapes
    if (steps.length === 0) return false
    const hasInvalidStep = steps.some((step) => !step.description.trim() || step.description.trim().length < 10)
    if (hasInvalidStep) return false

    // Vérifications numériques
    if (servings <= 0 || prepTime <= 0 || cookTime <= 0) return false

    return true
  })

  /**
   * Calcule le temps total de préparation
   */
  const totalTime = computed(() => {
    return formData.value.prepTime + formData.value.cookTime
  })

  return {
    isFormValid,
    totalTime
  }
}

/**
 * Formatte le temps en heures et minutes
 */
export function useTimeFormatter() {
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `${hours}h`
    }

    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`
  }

  return {
    formatTime
  }
}

/**
 * Gère la normalisation des données du formulaire
 */
export function useRecipeFormatter() {
  const normalizeFormData = (formData: RecipeFormData): RecipeFormData => {
    return {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      shortDescription: formData.shortDescription.trim(),
      ingredients: formData.ingredients.map((ing) => ({
        name: ing.name.trim(),
        quantity: ing.quantity.trim(),
        unit: ing.unit.trim()
      })),
      steps: formData.steps.map((step, index) => ({
        ...step,
        order: index + 1,
        description: step.description.trim()
      })),
      utensils: formData.utensils
        .filter((utensil) => utensil.name.trim() !== '')
        .map((utensil) => ({
          name: utensil.name.trim()
        }))
    }
  }

  return {
    normalizeFormData
  }
}
