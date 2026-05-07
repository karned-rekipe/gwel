import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse } from '@/services/http'
import type { ApiResponse } from '@/types/api'
import type { IngredientEnrichmentRunResult } from '@/types/recipe'

const enrichmentAgentApi = createHttpClient(`${appConfig.services.ingredientEnrichmentAgentApiBaseUrl}/v1`)

export const ingredientEnrichmentAgentService = {
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
