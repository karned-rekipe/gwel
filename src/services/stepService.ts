import { apiService } from './api'
import type { Step, CreateStepDTO, CreateResponse } from '@/types/recipe'

/**
 * Service Step - Couche d'abstraction pour les appels API
 */

export const stepService = {
  /**
   * Récupère toutes les étapes d'une recette
   */
  async getAllForRecipe(recipeUuid: string, name?: string): Promise<Step[]> {
    return apiService.getSteps(recipeUuid, name)
  },

  /**
   * Récupère une étape spécifique
   */
  async getByUuid(recipeUuid: string, stepUuid: string): Promise<Step> {
    return apiService.getStepByUuid(recipeUuid, stepUuid)
  },

  /**
   * Crée une nouvelle étape
   */
  async create(recipeUuid: string, data: CreateStepDTO): Promise<CreateResponse> {
    return apiService.createStep(recipeUuid, data)
  },

  /**
   * Met à jour une étape
   */
  async update(recipeUuid: string, stepUuid: string, data: Partial<Step>): Promise<void> {
    return apiService.updateStep(recipeUuid, stepUuid, data)
  },

  /**
   * Supprime une étape
   */
  async delete(recipeUuid: string, stepUuid: string): Promise<void> {
    return apiService.deleteStep(recipeUuid, stepUuid)
  }
}
