import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Recipe, Tag, TagPayload } from '@/types/recipe'

const tagApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`)

export const tagService = {
  async getPage(params: {
    name?: string
    page?: number
    per_page?: number
  } = {}): Promise<PaginatedResponse<Tag>> {
    const response = await tagApi.get<PaginatedResponse<Tag>>('/tags/', {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 50,
        ...(params.name ? { name: params.name } : {}),
      },
    })
    return response.data
  },

  async getAll(name?: string): Promise<Tag[]> {
    const response = await tagApi.get<PaginatedResponse<Tag>>('/tags/', {
      params: name ? { name, per_page: 100 } : { per_page: 100 },
    })
    return unwrapPaginatedResponse(response.data)
  },

  async getByUuid(uuid: string): Promise<Tag> {
    const response = await tagApi.get<ApiResponse<Tag>>(`/tags/${uuid}`)
    return unwrapApiResponse(response.data)
  },

  async getRecipes(uuid: string): Promise<Recipe[]> {
    const response = await tagApi.get<PaginatedResponse<Recipe>>(`/tags/${uuid}/recipes`)
    return unwrapPaginatedResponse(response.data)
  },

  async create(payload: TagPayload): Promise<Tag> {
    const response = await tagApi.post<ApiResponse<Tag>>('/tags/', payload, {
      headers: { Prefer: 'return=representation' },
    })
    return unwrapApiResponse(response.data)
  },

  async update(uuid: string, payload: Partial<TagPayload>): Promise<void> {
    await tagApi.patch(`/tags/${uuid}`, payload)
  },

  async delete(uuid: string): Promise<void> {
    await tagApi.delete(`/tags/${uuid}`)
  },
}
