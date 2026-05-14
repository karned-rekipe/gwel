import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Recipe, RecipeCreatePayload, RecipeCreatedResponse, RecipeStatus } from '@/types/recipe'

export interface RecipeListFilters {
  name?: string
  tag_uuid?: string
  difficulty?: string
  origin_country?: string
  price?: string
  favorite?: boolean | null
  season_month?: string
  status?: RecipeStatus
  meal_planner_eligible?: boolean | null
  page?: number
  per_page?: number
}

const recipeApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`, 30000)

export const recipeService = {
  async getPage(filters: RecipeListFilters = {}, signal?: AbortSignal): Promise<PaginatedResponse<Recipe>> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    )
    const response = await recipeApi.get<PaginatedResponse<Recipe>>('/recipes/', {
      params,
      signal,
    })

    return response.data
  },

  async getAll(name?: string): Promise<Recipe[]> {
    const response = await this.getPage({ name, page: 1, per_page: 100 })

    return unwrapPaginatedResponse(response)
  },

  async listEligibleRecipes(params: {
    search?: string
    page?: number
    page_size?: number
  } = {}): Promise<PaginatedResponse<Recipe>> {
    return this.getPage({
      name: params.search,
      page: params.page ?? 1,
      per_page: params.page_size ?? 20,
      meal_planner_eligible: true,
      status: 'active',
    })
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
