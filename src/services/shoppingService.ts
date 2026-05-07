import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  ShoppingExportRequest,
  ShoppingExportResult,
  ShoppingItemCreate,
  ShoppingItemPatch,
  ShoppingList,
  ShoppingListCreate,
  ShoppingListFromMealPlan,
  ShoppingListFromPeriod,
  Supplier,
  SupplierCreate,
  SupplierPatch,
} from '@/types/shopping'

const shoppingApi = createHttpClient(`${appConfig.services.shoppingApiBaseUrl}/v1`)

const readEtag = (headers: Record<string, unknown>): string => String(headers.etag ?? headers.ETag ?? '')

export const shoppingService = {
  async list(params: { page?: number; per_page?: number; name?: string } = {}): Promise<PaginatedResponse<ShoppingList>> {
    const response = await shoppingApi.get<PaginatedResponse<ShoppingList>>('/shopping-lists/', { params })
    return response.data
  },

  async get(uuid: string): Promise<{ payload: ShoppingList; etag: string }> {
    const response = await shoppingApi.get<ApiResponse<ShoppingList>>(`/shopping-lists/${uuid}`, {
      headers: { 'Cache-Control': 'no-cache' },
      params: { _cache: Date.now() },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async create(payload: ShoppingListCreate): Promise<string> {
    const response = await shoppingApi.post<ApiResponse<{ uuid: string }>>('/shopping-lists/', payload)
    return unwrapApiResponse(response.data).uuid
  },

  async generateFromMealPlan(payload: ShoppingListFromMealPlan): Promise<{ payload: ShoppingList; etag: string }> {
    const response = await shoppingApi.post<ApiResponse<ShoppingList>>('/shopping-lists/from-meal-plan', payload)
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async generateFromPeriod(payload: ShoppingListFromPeriod): Promise<{ payload: ShoppingList; etag: string }> {
    const response = await shoppingApi.post<ApiResponse<ShoppingList>>('/shopping-lists/from-period', payload)
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async refresh(uuid: string, etag: string): Promise<{ payload: ShoppingList; etag: string }> {
    const response = await shoppingApi.post<ApiResponse<ShoppingList>>(`/shopping-lists/${uuid}/refresh`, null, {
      headers: { 'If-Match': etag },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async addItem(uuid: string, etag: string, payload: ShoppingItemCreate): Promise<{ payload: ShoppingList; etag: string }> {
    const response = await shoppingApi.post<ApiResponse<ShoppingList>>(`/shopping-lists/${uuid}/items`, payload, {
      headers: { 'If-Match': etag },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async patchItem(
    uuid: string,
    itemUuid: string,
    etag: string,
    payload: ShoppingItemPatch,
  ): Promise<{ payload: ShoppingList; etag: string }> {
    const response = await shoppingApi.patch<ApiResponse<ShoppingList>>(`/shopping-lists/${uuid}/items/${itemUuid}`, payload, {
      headers: { 'If-Match': etag },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async exportText(uuid: string, payload: ShoppingExportRequest): Promise<ShoppingExportResult> {
    const response = await shoppingApi.post<ApiResponse<ShoppingExportResult>>(`/shopping-lists/${uuid}/export-text`, payload)
    return unwrapApiResponse(response.data)
  },

  async listSuppliers(params: { page?: number; per_page?: number; name?: string } = {}): Promise<PaginatedResponse<Supplier>> {
    const response = await shoppingApi.get<PaginatedResponse<Supplier>>('/suppliers/', { params })
    return response.data
  },

  async createSupplier(payload: SupplierCreate): Promise<string> {
    const response = await shoppingApi.post<ApiResponse<{ uuid: string }>>('/suppliers/', payload)
    return unwrapApiResponse(response.data).uuid
  },

  async updateSupplier(uuid: string, version: number, payload: SupplierPatch): Promise<Supplier> {
    const response = await shoppingApi.patch<ApiResponse<Supplier>>(`/suppliers/${uuid}`, payload, {
      headers: { 'If-Match': `W/"${version}"` },
    })
    return unwrapApiResponse(response.data)
  },
}
