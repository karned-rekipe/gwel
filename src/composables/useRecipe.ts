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
    const { name, description, ingredients, steps } = formData.value

    // Vérifications basiques
    if (!name.trim() || name.trim().length < 3) return false
    if (!description.trim() || description.trim().length < 10) return false

    // Vérifications des ingrédients
    if (ingredients.length === 0) return false
    const hasInvalidIngredient = ingredients.some(
      (ing) => !ing.name.trim() || !ing.unit.trim()
    )
    if (hasInvalidIngredient) return false

    // Vérifications des étapes
    if (steps.length === 0) return false
    return !steps.some(
      (step) => !step.name.trim() || !step.description.trim() || step.description.trim().length < 10
    )
  })

  return {
    isFormValid
  }
}

/**
 * Gère la normalisation des données du formulaire
 */
export function useRecipeFormatter() {
  const normalizeFormData = (formData: RecipeFormData): RecipeFormData => {
    return {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      ingredients: formData.ingredients.map((ing) => ({
        name: ing.name.trim(),
        unit: ing.unit.trim()
      })),
      steps: formData.steps.map((step) => ({
        name: step.name.trim(),
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
