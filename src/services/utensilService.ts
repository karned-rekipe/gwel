import { apiService } from './api'
import type { Utensil, CreateUtensilDTO, CreateResponse } from '@/types/recipe'

/**
 * Service Utensil - Couche d'abstraction pour les appels API
 */

export const utensilService = {
  /**
   * Récupère tous les ustensiles
   */
  async getAll(): Promise<Utensil[]> {
    return apiService.getUtensils()
  },

  /**
   * Récupère un ustensile par UUID
   */
  async getByUuid(uuid: string): Promise<Utensil> {
    return apiService.getUtensilByUuid(uuid)
  },

  /**
   * Recherche des ustensiles par nom
   */
  async searchByName(name: string): Promise<Utensil[]> {
    return apiService.searchUtensilsByName(name)
  },

  /**
   * Crée un nouvel ustensile
   */
  async create(data: CreateUtensilDTO): Promise<CreateResponse> {
    return apiService.createUtensil(data)
  },

  /**
   * Met à jour un ustensile
   */
  async update(uuid: string, data: Partial<Utensil>): Promise<void> {
    return apiService.updateUtensil(uuid, data)
  },

  /**
   * Supprime un ustensile
   */
  async delete(uuid: string): Promise<void> {
    return apiService.deleteUtensil(uuid)
  }
}
