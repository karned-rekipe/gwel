import { apiService } from './api'
import type {
  Recipe,
  CreateRecipeDTO,
  CreateIngredientDTO,
  CreateStepDTO,
  CreateUtensilDTO,
  CreateResponse
} from '@/types/recipe'

/**
 * Service Recipe - Couche d'abstraction pour les appels API
 * Isole la logique Axios des composants
 */

export const recipeService = {
  /**
   * Récupère toutes les recettes
   */
  async getAll(): Promise<Recipe[]> {
    return apiService.getRecipes()
  },

  /**
   * Récupère une recette par UUID
   */
  async getByUuid(uuid: string): Promise<Recipe> {
    return apiService.getRecipeByUuid(uuid)
  },

  /**
   * Recherche des recettes par nom
   */
  async searchByName(name: string): Promise<Recipe[]> {
    return apiService.searchRecipesByName(name)
  },

  /**
   * Crée une recette complète avec ingrédients, étapes et ustensiles
   */
  async create(data: {
    recipe: CreateRecipeDTO
    ingredients: CreateIngredientDTO[]
    steps: CreateStepDTO[]
    utensils: CreateUtensilDTO[]
  }): Promise<CreateResponse> {
    // 1. Créer la recette
    const recipeResponse = await apiService.createRecipe(data.recipe)
    const recipeUuid = recipeResponse.uuid

    // 2. Créer les ingrédients en parallèle
    await Promise.all(data.ingredients.map((ing) => apiService.createIngredient(ing)))

    // 3. Créer les étapes en parallèle
    await Promise.all(data.steps.map((step) => apiService.createStep(recipeUuid, step)))

    // 4. Créer les ustensiles en parallèle
    await Promise.all(data.utensils.map((utensil) => apiService.createUtensil(utensil)))

    return recipeResponse
  },

  /**
   * Met à jour une recette (PATCH)
   */
  async update(uuid: string, data: Partial<Recipe>): Promise<void> {
    return apiService.updateRecipe(uuid, data)
  },

  /**
   * Remplace une recette complètement (PUT)
   */
  async replace(uuid: string, data: Recipe): Promise<void> {
    return apiService.replaceRecipe(uuid, data)
  },

  /**
   * Supprime une recette (soft delete)
   */
  async delete(uuid: string): Promise<void> {
    return apiService.deleteRecipe(uuid)
  },

  /**
   * Duplique une recette
   */
  async duplicate(uuid: string): Promise<CreateResponse> {
    return apiService.duplicateRecipe(uuid)
  }
}
