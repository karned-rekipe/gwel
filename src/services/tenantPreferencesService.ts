import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse } from '@/services/http'
import type { ApiResponse } from '@/types/api'
import type { TenantPreferences, TenantPreferencesUpdate } from '@/types/tenantPreferences'

const tenantPreferencesApi = createHttpClient(`${appConfig.services.mealPlannerApiBaseUrl}/v1`)

const readEtag = (headers: Record<string, unknown>): string => String(headers.etag ?? headers.ETag ?? '')

export const tenantPreferencesService = {
  async get(): Promise<{ payload: TenantPreferences; etag: string }> {
    const response = await tenantPreferencesApi.get<ApiResponse<TenantPreferences>>('/tenant-preferences/')
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async update(etag: string, payload: TenantPreferencesUpdate): Promise<{ payload: TenantPreferences; etag: string }> {
    const response = await tenantPreferencesApi.put<ApiResponse<TenantPreferences>>('/tenant-preferences/', payload, {
      headers: { 'If-Match': etag },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },
}
