import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Recipe, RecipeCreatePayload, RecipeCreatedResponse } from '@/types/recipe'

const recipeApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`)

export const recipeService = {
  async getAll(name?: string): Promise<Recipe[]> {
    const response = await recipeApi.get<PaginatedResponse<Recipe>>('/recipes/', {
      params: name ? { name } : undefined,
    })

    return unwrapPaginatedResponse(response.data)
  },

  async getByUuid(uuid: string): Promise<Recipe> {
    const response = await recipeApi.get<ApiResponse<Recipe>>(`/recipes/${uuid}`)
    return unwrapApiResponse(response.data)
  },

  async searchByName(name: string): Promise<Recipe[]> {
    return this.getAll(name)
  },

  async create(payload: RecipeCreatePayload): Promise<RecipeCreatedResponse> {
    const response = await recipeApi.post<ApiResponse<RecipeCreatedResponse>>('/recipes/', payload)
    return unwrapApiResponse(response.data)
  },

  async update(uuid: string, payload: Partial<RecipeCreatePayload>): Promise<void> {
    await recipeApi.patch(`/recipes/${uuid}`, payload)
  },

  async replace(uuid: string, payload: RecipeCreatePayload): Promise<void> {
    await recipeApi.put(`/recipes/${uuid}`, payload)
  },

  async delete(uuid: string): Promise<void> {
    await recipeApi.delete(`/recipes/${uuid}`)
  },

  async duplicate(uuid: string): Promise<RecipeCreatedResponse> {
    const response = await recipeApi.post<ApiResponse<RecipeCreatedResponse>>(`/recipes/${uuid}/duplicate`)
    return unwrapApiResponse(response.data)
  },
}
