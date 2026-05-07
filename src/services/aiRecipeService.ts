import { appConfig } from '@/config/env'
import { createHttpClient } from '@/services/http'
import type { CreateRecipeWithAIDTO, AICreateResponse } from '@/types/recipe'

class AIRecipeService {
  private api = createHttpClient(`${appConfig.services.recipeAgentApiBaseUrl}/v1`, 30000)

  async createRecipeWithAI(rawText: string, allowDuplicate = false): Promise<AICreateResponse> {
    const payload: CreateRecipeWithAIDTO = {
      raw_text: rawText.trim(),
      allow_duplicate: allowDuplicate,
    }

    const response = await this.api.post<AICreateResponse>('/recipes/ai-create', payload)
    return response.data
  }
}

export const aiRecipeService = new AIRecipeService()
