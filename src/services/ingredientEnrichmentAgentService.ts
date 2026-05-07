import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { IngredientEnrichmentRun, IngredientEnrichmentRunResult } from '@/types/recipe'

const enrichmentAgentApi = createHttpClient(`${appConfig.services.ingredientEnrichmentAgentApiBaseUrl}/v1`)

export const ingredientEnrichmentAgentService = {
  async listRuns(params: {
    page?: number
    per_page?: number
    ingredient_uuid?: string
  } = {}): Promise<PaginatedResponse<IngredientEnrichmentRun>> {
    const response = await enrichmentAgentApi.get<PaginatedResponse<IngredientEnrichmentRun>>(
      '/ingredient-enrichment/runs/',
      {
        params: {
          page: params.page ?? 1,
          per_page: params.per_page ?? 50,
          ...(params.ingredient_uuid ? { ingredient_uuid: params.ingredient_uuid } : {}),
        },
      },
    )
    return response.data
  },

  async enrichIngredient(ingredientUuid: string): Promise<IngredientEnrichmentRunResult> {
    const response = await enrichmentAgentApi.post<ApiResponse<IngredientEnrichmentRunResult>>(
      '/ingredient-enrichment/runs',
      { ingredient_uuid: ingredientUuid },
    )
    return unwrapApiResponse(response.data)
  },

  async enrichBatch(payload: {
    ingredient_uuids?: string[]
    limit?: number
    continue_on_error?: boolean
  }): Promise<IngredientEnrichmentRunResult[]> {
    const response = await enrichmentAgentApi.post<ApiResponse<IngredientEnrichmentRunResult[]>>(
      '/ingredient-enrichment/batch',
      payload,
    )
    return unwrapApiResponse(response.data)
  },
}
