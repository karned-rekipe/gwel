import { appConfig } from '@/config/env'
import { createHttpClient } from '@/services/http'
import type { CreateRecipeWithAIDTO, AICreateResponse, RecipeAIInput } from '@/types/recipe'

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
}

export const aiRecipeService = new AIRecipeService()
