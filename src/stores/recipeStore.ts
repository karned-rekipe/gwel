import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Recipe, RecipeFormData } from '@/types/recipe'
import recipesData from '@/data/recipes.json'

export const useRecipeStore = defineStore('recipe', () => {
  // State
  const recipes = ref<Recipe[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const searchTerm = ref<string>('')

  // Getters
  const getRecipeById = computed(() => {
    return (id: string): Recipe | undefined => {
      return recipes.value.find((recipe) => recipe.id === id)
    }
  })

  const filteredRecipes = computed(() => {
    if (!searchTerm.value.trim()) {
      return recipes.value
    }

    const term = searchTerm.value.toLowerCase().trim()

    return recipes.value.filter((recipe) => {
      // Recherche dans le titre
      if (recipe.title.toLowerCase().includes(term)) {
        return true
      }

      // Recherche dans la description courte
      if (recipe.shortDescription.toLowerCase().includes(term)) {
        return true
      }

      // Recherche dans les ingrédients
      return recipe.ingredients.some((ingredient) =>
        ingredient.name.toLowerCase().includes(term)
      )
    })
  })

  const recipesCount = computed(() => recipes.value.length)

  const isEmpty = computed(() => recipes.value.length === 0)

  // Actions
  const fetchRecipes = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Simulation d'une requête API avec un délai
      await new Promise((resolve) => setTimeout(resolve, 500))

      recipes.value = recipesData as Recipe[]
    } catch (e) {
      error.value = 'Erreur lors du chargement des recettes'
      console.error('Fetch recipes error:', e)
    } finally {
      loading.value = false
    }
  }

  const addRecipe = (formData: RecipeFormData): void => {
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      ...formData,
      ingredients: formData.ingredients.map((ing, index) => ({
        ...ing,
        id: `${Date.now()}-ing-${index}`
      })),
      steps: formData.steps.map((step, index) => ({
        ...step,
        id: `${Date.now()}-step-${index}`
      })),
      utensils: formData.utensils.map((utensil, index) => ({
        ...utensil,
        id: `${Date.now()}-utensil-${index}`
      })),
      createdAt: new Date().toISOString()
    }

    recipes.value.unshift(newRecipe) // Ajouter en début de liste
  }

  const setSearchTerm = (term: string): void => {
    searchTerm.value = term
  }

  const clearSearch = (): void => {
    searchTerm.value = ''
  }

  return {
    // State
    recipes,
    loading,
    error,
    searchTerm,
    // Getters
    getRecipeById,
    filteredRecipes,
    recipesCount,
    isEmpty,
    // Actions
    fetchRecipes,
    addRecipe,
    setSearchTerm,
    clearSearch
  }
})
