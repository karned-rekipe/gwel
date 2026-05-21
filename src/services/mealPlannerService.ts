import { appConfig } from '@/config/env'
import { createHttpClient } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  MealPlanCreate,
  MealPlanRead,
  MealPlanStatus,
  MealPlanSummary,
  MealPlanUpdate,
  ShoppingProjection,
  SlotPatchOperation,
} from '@/types/mealPlan'

const mealPlannerApi = createHttpClient(`${appConfig.services.mealPlannerApiBaseUrl}/v1`)

const readEtag = (headers: Record<string, unknown>): string => String(headers.etag ?? headers.ETag ?? '')
const cleanParams = (params: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
const toPersistedPatchOperations = (operations: SlotPatchOperation[]): SlotPatchOperation[] => operations.map((operation) => {
  if (!operation.item || operation.item.item_type !== 'recipe') return operation
  return {
    ...operation,
    item: {
      ...operation.item,
      recipe_snapshot: null,
    },
  }
})

export interface MealCalendarParams {
  date_from?: string
  date_to?: string
}

export const mealPlannerService = {
  async list(params: {
    status?: MealPlanStatus | ''
    date_from?: string
    date_to?: string
    page?: number
    page_size?: number
  } = {}): Promise<PaginatedResponse<MealPlanSummary>> {
    const response = await mealPlannerApi.get<PaginatedResponse<MealPlanSummary>>('/meal-plans/', {
      params: cleanParams(params),
    })
    return response.data
  },

  async calendar(params: MealCalendarParams = {}): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.get<ApiResponse<MealPlanRead>>('/meal-plans/calendar', {
      params: cleanParams(params),
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async get(uuid: string): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.get<ApiResponse<MealPlanRead>>(`/meal-plans/${uuid}`)
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async create(input: MealPlanCreate, idempotencyKey?: string): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.post<ApiResponse<MealPlanRead>>('/meal-plans/', input, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async update(uuid: string, etag: string, input: MealPlanUpdate): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.put<ApiResponse<MealPlanRead>>(`/meal-plans/${uuid}`, input, {
      headers: { 'If-Match': etag },
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async patch(uuid: string, etag: string, operations: SlotPatchOperation[]): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.patch<ApiResponse<MealPlanRead>>(`/meal-plans/${uuid}`, {
      operations: toPersistedPatchOperations(operations),
    }, {
      headers: { 'If-Match': etag },
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async patchCalendar(operations: SlotPatchOperation[], params: MealCalendarParams = {}): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.patch<ApiResponse<MealPlanRead>>('/meal-plans/calendar', {
      operations: toPersistedPatchOperations(operations),
    }, {
      params: cleanParams(params),
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async transition(uuid: string, etag: string, target: MealPlanStatus): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.post<ApiResponse<MealPlanRead>>(`/meal-plans/${uuid}/transitions`, { target_status: target }, {
      headers: { 'If-Match': etag },
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async remove(uuid: string, etag: string): Promise<void> {
    await mealPlannerApi.delete(`/meal-plans/${uuid}`, { headers: { 'If-Match': etag } })
  },

  async refreshSnapshots(uuid: string, etag: string, items: { slot_date: string; slot_code: string; item_uuid: string }[]): Promise<{ payload: ApiResponse<MealPlanRead>; etag: string }> {
    const response = await mealPlannerApi.post<ApiResponse<MealPlanRead>>(`/meal-plans/${uuid}/refresh-snapshots`, { items }, {
      headers: { 'If-Match': etag },
    })
    return { payload: response.data, etag: readEtag(response.headers) }
  },

  async shoppingProjection(uuid: string): Promise<ShoppingProjection> {
    const response = await mealPlannerApi.get<ApiResponse<ShoppingProjection>>(`/meal-plans/${uuid}/shopping-projection`)
    if (!response.data.data) {
      throw new Error('Projection shopping indisponible')
    }
    return response.data.data
  },
}
