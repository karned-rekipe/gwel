import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse } from '@/services/http'
import type { ApiResponse } from '@/types/api'
import type { HouseholdMember, HouseholdMemberPayload } from '@/types/householdMember'

const api = createHttpClient(`${appConfig.services.mealPlannerApiBaseUrl}/v1`)

const readEtag = (headers: Record<string, unknown>): string => String(headers.etag ?? headers.ETag ?? '')

export const householdMemberService = {
  async list(): Promise<HouseholdMember[]> {
    const response = await api.get<ApiResponse<HouseholdMember[]>>('/household-members/')
    return unwrapApiResponse(response.data)
  },

  async create(payload: HouseholdMemberPayload): Promise<{ payload: HouseholdMember; etag: string }> {
    const response = await api.post<ApiResponse<HouseholdMember>>('/household-members/', payload)
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async update(
    uuid: string,
    etag: string,
    payload: HouseholdMemberPayload,
  ): Promise<{ payload: HouseholdMember; etag: string }> {
    const response = await api.put<ApiResponse<HouseholdMember>>(`/household-members/${uuid}`, payload, {
      headers: { 'If-Match': etag },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async updateAvatar(
    uuid: string,
    etag: string,
    avatarData: string,
  ): Promise<{ payload: HouseholdMember; etag: string }> {
    const response = await api.put<ApiResponse<HouseholdMember>>(
      `/household-members/${uuid}/avatar`,
      { avatar_data: avatarData },
      { headers: { 'If-Match': etag } },
    )
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async remove(uuid: string, etag: string): Promise<void> {
    await api.delete(`/household-members/${uuid}`, {
      headers: { 'If-Match': etag },
    })
  },
}
