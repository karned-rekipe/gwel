import { appConfig } from '@/config/env'
import { createHttpClient } from '@/services/http'

export interface GeneratedRecipeImage {
  image: {
    bucket: string
    key: string
    url: string
    content_type: string
    size_bytes: number
  }
  provider: string
}

const mediaApi = createHttpClient(`${appConfig.services.mediaApiBaseUrl}/v1`, 120000)

export const mediaService = {
  async generateRecipeImage(params: {
    recipeUuid: string
    recipeName: string
    prompt?: string | null
  }): Promise<GeneratedRecipeImage> {
    const response = await mediaApi.post<GeneratedRecipeImage>('/recipe-images/generate', {
      recipe_uuid: params.recipeUuid,
      recipe_name: params.recipeName,
      prompt: params.prompt?.trim() || null,
    })
    return response.data
  },
}
