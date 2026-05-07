import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  DuplicateGroup,
  DuplicateMergePayload,
  DuplicateMergeResult,
  Ingredient,
  IngredientEnrichmentSuggestion,
  IngredientEnrichmentSuggestionActionPayload,
  IngredientPayload,
  Recipe,
} from '@/types/recipe'

const ingredientApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`)

export const ingredientService = {
  async getPage(params: {
    name?: string
    group_uuid?: string
    rayon_uuid?: string
    page?: number
    per_page?: number
  } = {}): Promise<PaginatedResponse<Ingredient>> {
    const response = await ingredientApi.get<PaginatedResponse<Ingredient>>('/ingredients/', {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 50,
        ...(params.name ? { name: params.name } : {}),
        ...(params.group_uuid ? { group_uuid: params.group_uuid } : {}),
        ...(params.rayon_uuid ? { rayon_uuid: params.rayon_uuid } : {}),
      },
    })
    return response.data
  },

  async getAll(name?: string, perPage = 100): Promise<Ingredient[]> {
    const response = await ingredientApi.get<PaginatedResponse<Ingredient>>('/ingredients/', {
      params: {
        per_page: perPage,
        ...(name ? { name } : {}),
      },
    })
    return unwrapPaginatedResponse(response.data)
  },

  async getByUuid(uuid: string): Promise<Ingredient> {
    const response = await ingredientApi.get<ApiResponse<Ingredient>>(`/ingredients/${uuid}`, {
      headers: { 'Cache-Control': 'no-cache' },
      params: { _cache: Date.now() },
    })
    return unwrapApiResponse(response.data)
  },

  async getRecipes(uuid: string): Promise<Recipe[]> {
    const response = await ingredientApi.get<PaginatedResponse<Recipe>>(`/ingredients/${uuid}/recipes`)
    return unwrapPaginatedResponse(response.data)
  },

  async create(payload: IngredientPayload): Promise<Ingredient> {
    const response = await ingredientApi.post<ApiResponse<Ingredient>>('/ingredients/', payload, {
      headers: { Prefer: 'return=representation' },
    })
    return unwrapApiResponse(response.data)
  },

  async update(uuid: string, payload: Partial<IngredientPayload>): Promise<void> {
    await ingredientApi.patch(`/ingredients/${uuid}`, payload)
  },

  async listEnrichmentSuggestions(uuid: string): Promise<IngredientEnrichmentSuggestion[]> {
    const response = await ingredientApi.get<ApiResponse<IngredientEnrichmentSuggestion[]>>(
      `/ingredients/${uuid}/enrichment-suggestions`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _cache: Date.now() },
      },
    )
    return unwrapApiResponse(response.data)
  },

  async applyEnrichmentSuggestion(
    uuid: string,
    suggestionUuid: string,
    payload: IngredientEnrichmentSuggestionActionPayload,
  ): Promise<IngredientEnrichmentSuggestion> {
    const response = await ingredientApi.post<ApiResponse<IngredientEnrichmentSuggestion>>(
      `/ingredients/${uuid}/enrichment-suggestions/${suggestionUuid}/apply`,
      payload,
    )
    return unwrapApiResponse(response.data)
  },

  async rejectEnrichmentSuggestion(
    uuid: string,
    suggestionUuid: string,
    payload: IngredientEnrichmentSuggestionActionPayload = {},
  ): Promise<IngredientEnrichmentSuggestion> {
    const response = await ingredientApi.post<ApiResponse<IngredientEnrichmentSuggestion>>(
      `/ingredients/${uuid}/enrichment-suggestions/${suggestionUuid}/reject`,
      payload,
    )
    return unwrapApiResponse(response.data)
  },

  async delete(uuid: string): Promise<void> {
    await ingredientApi.delete(`/ingredients/${uuid}`)
  },

  async getDuplicates(): Promise<DuplicateGroup[]> {
    const response = await ingredientApi.get<ApiResponse<DuplicateGroup[]>>('/ingredients/duplicates')
    return unwrapApiResponse(response.data)
  },

  async mergeDuplicates(payload: DuplicateMergePayload): Promise<DuplicateMergeResult> {
    const response = await ingredientApi.post<ApiResponse<DuplicateMergeResult>>('/ingredients/duplicates/merge', payload)
    return unwrapApiResponse(response.data)
  },
}
