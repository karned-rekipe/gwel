import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { IngredientGroup, IngredientRayon, IngredientSettingPayload } from '@/types/recipe'

const settingApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`)

const makeSettingService = <T>(path: string) => ({
  async getAll(name?: string): Promise<T[]> {
    const response = await settingApi.get<PaginatedResponse<T>>(path, {
      params: name ? { name, per_page: 100 } : { per_page: 100 },
    })
    return unwrapPaginatedResponse(response.data)
  },

  async getByUuid(uuid: string): Promise<T> {
    const response = await settingApi.get<ApiResponse<T>>(`${path}${uuid}`)
    return unwrapApiResponse(response.data)
  },

  async create(payload: IngredientSettingPayload): Promise<T> {
    const response = await settingApi.post<ApiResponse<T>>(path, payload, {
      headers: { Prefer: 'return=representation' },
    })
    return unwrapApiResponse(response.data)
  },

  async update(uuid: string, payload: Partial<IngredientSettingPayload>): Promise<void> {
    await settingApi.patch(`${path}${uuid}`, payload)
  },

  async delete(uuid: string): Promise<void> {
    await settingApi.delete(`${path}${uuid}`)
  },
})

export const ingredientGroupService = makeSettingService<IngredientGroup>('/ingredient-groups/')
export const ingredientRayonService = makeSettingService<IngredientRayon>('/ingredient-rayons/')
