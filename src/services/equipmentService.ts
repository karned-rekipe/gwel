import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  DuplicateGroup,
  DuplicateMergePayload,
  DuplicateMergeResult,
  Equipment,
  EquipmentPayload,
  Recipe,
} from '@/types/recipe'

const equipmentApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`)

export interface GeneratedEquipmentImage {
  equipment: Equipment
  image: {
    bucket: string
    key: string
    url: string
    content_type: string
    size_bytes: number
  }
  provider: string
}

export const equipmentService = {
  async getPage(params: {
    name?: string
    page?: number
    per_page?: number
  } = {}): Promise<PaginatedResponse<Equipment>> {
    const response = await equipmentApi.get<PaginatedResponse<Equipment>>('/equipment/', {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 50,
        ...(params.name ? { name: params.name } : {}),
      },
    })
    return response.data
  },

  async getAll(name?: string, perPage = 100): Promise<Equipment[]> {
    const response = await equipmentApi.get<PaginatedResponse<Equipment>>('/equipment/', {
      params: {
        per_page: perPage,
        ...(name ? { name } : {}),
      },
    })
    return unwrapPaginatedResponse(response.data)
  },

  async getByUuid(uuid: string): Promise<Equipment> {
    const response = await equipmentApi.get<ApiResponse<Equipment>>(`/equipment/${uuid}`, {
      headers: { 'Cache-Control': 'no-cache' },
      params: { _cache: Date.now() },
    })
    return unwrapApiResponse(response.data)
  },

  async getRecipes(uuid: string): Promise<Recipe[]> {
    const response = await equipmentApi.get<PaginatedResponse<Recipe>>(`/equipment/${uuid}/recipes`)
    return unwrapPaginatedResponse(response.data)
  },

  async create(payload: EquipmentPayload): Promise<Equipment> {
    const response = await equipmentApi.post<ApiResponse<Equipment>>('/equipment/', payload, {
      headers: { Prefer: 'return=representation' },
    })
    return unwrapApiResponse(response.data)
  },

  async update(uuid: string, payload: Partial<EquipmentPayload>): Promise<Equipment> {
    await equipmentApi.patch(`/equipment/${uuid}`, payload)
    return this.getByUuid(uuid)
  },

  async delete(uuid: string): Promise<void> {
    await equipmentApi.delete(`/equipment/${uuid}`)
  },

  async generateImage(
    uuid: string,
    replaceExisting = false,
  ): Promise<GeneratedEquipmentImage> {
    const response = await equipmentApi.post<ApiResponse<GeneratedEquipmentImage>>(
      `/equipment/${uuid}/main-image`,
      {
        replace_existing: replaceExisting,
      },
      { timeout: 120000 },
    )
    return unwrapApiResponse(response.data)
  },

  async getDuplicates(): Promise<DuplicateGroup[]> {
    const response = await equipmentApi.get<ApiResponse<DuplicateGroup[]>>('/equipment/duplicates')
    return unwrapApiResponse(response.data)
  },

  async mergeDuplicates(payload: DuplicateMergePayload): Promise<DuplicateMergeResult> {
    const response = await equipmentApi.post<ApiResponse<DuplicateMergeResult>>('/equipment/duplicates/merge', payload)
    return unwrapApiResponse(response.data)
  },
}
