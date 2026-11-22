import { appConfig } from '@/config/env'
import { createHttpClient, isNotFoundError } from '@/services/http'
import type {
  AICreateResponse,
  CreateRecipeWithAIDTO,
  RecipeAIInput,
  RecipeEnrichmentRun,
} from '@/types/recipe'

class AIRecipeService {
  private api = createHttpClient(`${appConfig.services.recipeAgentApiBaseUrl}/v1`, 180000)

  async createRecipeWithAI(input: RecipeAIInput, allowDuplicate = false): Promise<AICreateResponse> {
    const payload: CreateRecipeWithAIDTO = {
      allow_duplicate: allowDuplicate,
      generate_image: true,
    }

    switch (input.kind) {
      case 'text':
        payload.raw_text = input.rawText.trim()
        break
      case 'url':
        payload.source_url = input.url.trim()
        break
      case 'image-url':
        payload.image_url = input.url.trim()
        break
      case 'image-upload':
        payload.image_base64 = input.base64
        payload.image_media_type = input.mediaType
        break
    }

    const response = await this.api.post<AICreateResponse>('/recipes/ai-create', payload)
    return response.data
  }

  async enrichExistingRecipe(recipeUuid: string): Promise<AICreateResponse> {
    const response = await this.api.post<AICreateResponse>(
      `/recipes/${recipeUuid}/ai-enrich`,
      { generate_image: true },
    )
    return response.data
  }

  async getRunningRecipeEnrichment(recipeUuid: string): Promise<RecipeEnrichmentRun | null> {
    try {
      const response = await this.api.get<RecipeEnrichmentRun>(
        `/agent-runs/recipes/${recipeUuid}/running`,
        {
          headers: { 'Cache-Control': 'no-cache' },
          params: { _cache: Date.now() },
        },
      )
      return response.data
    } catch (err) {
      if (isNotFoundError(err)) return null
      throw err
    }
  }
}

export const aiRecipeService = new AIRecipeService()
