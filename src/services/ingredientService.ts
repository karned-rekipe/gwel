import { apiService } from './api'
import type { Ingredient, CreateIngredientDTO, CreateResponse } from '@/types/recipe'

/**
 * Service Ingredient - Couche d'abstraction pour les appels API
 */

export const ingredientService = {
  /**
   * Récupère tous les ingrédients
   */
  async getAll(name?: string): Promise<Ingredient[]> {
    return apiService.getIngredients(name)
  },

  /**
   * Récupère un ingrédient par UUID
   */
  async getByUuid(uuid: string): Promise<Ingredient> {
    return apiService.getIngredientByUuid(uuid)
  },

  /**
   * Crée un nouvel ingrédient
   */
  async create(data: CreateIngredientDTO): Promise<CreateResponse> {
    return apiService.createIngredient(data)
  },

  /**
   * Met à jour un ingrédient
   */
  async update(uuid: string, data: Partial<Ingredient>): Promise<void> {
    return apiService.updateIngredient(uuid, data)
  },

  /**
   * Supprime un ingrédient
   */
  async delete(uuid: string): Promise<void> {
    return apiService.deleteIngredient(uuid)
  }
}
