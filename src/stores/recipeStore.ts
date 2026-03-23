import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Recipe, RecipeFormData } from '@/types/recipe'
import { apiService } from '@/services/api'

export const useRecipeStore = defineStore('recipe', () => {
  // State
  const recipes = ref<Recipe[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const searchTerm = ref<string>('')

  // Getters
  const getRecipeByUuid = computed(() => {
    return (uuid: string): Recipe | undefined => {
      return recipes.value.find((recipe) => recipe.uuid === uuid)
    }
  })

  const filteredRecipes = computed(() => {
    if (!searchTerm.value.trim()) {
      return recipes.value
    }

    const term = searchTerm.value.toLowerCase().trim()

    return recipes.value.filter((recipe) => {
      if (recipe.name.toLowerCase().includes(term)) return true
      if (recipe.description?.toLowerCase().includes(term)) return true
      if (recipe.ingredients) {
        return recipe.ingredients.some((ingredient) =>
          ingredient.name.toLowerCase().includes(term)
        )
      }
      return false
    })
  })

  const recipesCount = computed(() => recipes.value.length)

  const isEmpty = computed(() => recipes.value.length === 0)

  // Actions
  const fetchRecipes = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      recipes.value = await apiService.getRecipes()
    } catch (e) {
      error.value = 'Erreur lors du chargement des recettes'
      console.error('Fetch recipes error:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchRecipeByUuid = async (uuid: string): Promise<Recipe | null> => {
    loading.value = true
    error.value = null

    try {
      const recipe = await apiService.getRecipeByUuid(uuid)
      // Mettre à jour dans le cache local si nécessaire
      const index = recipes.value.findIndex((r) => r.uuid === uuid)
      if (index !== -1) {
        recipes.value[index] = recipe
      }
      return recipe
    } catch (e) {
      error.value = 'Erreur lors du chargement de la recette'
      console.error('Fetch recipe error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  const addRecipe = async (formData: RecipeFormData): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const recipeResponse = await apiService.createRecipe({
        name: formData.name,
        description: formData.description
      })

      const recipeUuid = recipeResponse.uuid

      // 2. Créer les ingrédients
      const ingredientPromises = formData.ingredients.map((ing) =>
        apiService.createIngredient(ing)
      )
      await Promise.all(ingredientPromises)

      // 3. Créer les étapes
      const stepPromises = formData.steps.map((step) => apiService.createStep(recipeUuid, step))
      await Promise.all(stepPromises)

      // 4. Créer les ustensiles
      const utensilPromises = formData.utensils.map((utensil) =>
        apiService.createUtensil(utensil)
      )
      await Promise.all(utensilPromises)

      // 5. Rafraîchir la liste des recettes
      await fetchRecipes()

      return true
    } catch (e) {
      error.value = 'Erreur lors de la création de la recette'
      console.error('Add recipe error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const updateRecipe = async (uuid: string, data: Partial<Recipe>): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      await apiService.updateRecipe(uuid, data)
      await fetchRecipes()
      return true
    } catch (e) {
      error.value = 'Erreur lors de la mise à jour de la recette'
      console.error('Update recipe error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteRecipe = async (uuid: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      await apiService.deleteRecipe(uuid)
      // Retirer de la liste locale
      recipes.value = recipes.value.filter((r) => r.uuid !== uuid)
      return true
    } catch (e) {
      error.value = 'Erreur lors de la suppression de la recette'
      console.error('Delete recipe error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const searchRecipes = async (term: string): Promise<void> => {
    if (!term.trim()) {
      await fetchRecipes()
      return
    }

    loading.value = true
    error.value = null

    try {
      recipes.value = await apiService.searchRecipesByName(term)
    } catch (e) {
      error.value = 'Erreur lors de la recherche de recettes'
      console.error('Search recipes error:', e)
    } finally {
      loading.value = false
    }
  }

  const setSearchTerm = (term: string): void => {
    searchTerm.value = term
  }

  const clearSearch = (): void => {
    searchTerm.value = ''
    fetchRecipes()
  }

  return {
    // State
    recipes,
    loading,
    error,
    searchTerm,
    // Getters
    getRecipeByUuid,
    filteredRecipes,
    recipesCount,
    isEmpty,
    // Actions
    fetchRecipes,
    fetchRecipeByUuid,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    searchRecipes,
    setSearchTerm,
    clearSearch
  }
})
