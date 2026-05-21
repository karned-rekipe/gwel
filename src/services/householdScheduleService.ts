import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse } from '@/services/http'
import type { ApiResponse } from '@/types/api'
import type {
  HouseholdSchedule,
  HouseholdScheduleUpdate,
  SchoolVacationPeriod,
  SchoolVacationPeriodPayload,
} from '@/types/householdSchedule'

const householdScheduleApi = createHttpClient(`${appConfig.services.mealPlannerApiBaseUrl}/v1`)

const readEtag = (headers: Record<string, unknown>): string => String(headers.etag ?? headers.ETag ?? '')

export const householdScheduleService = {
  async get(): Promise<{ payload: HouseholdSchedule; etag: string }> {
    const response = await householdScheduleApi.get<ApiResponse<HouseholdSchedule>>('/household-schedule/')
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async update(etag: string, payload: HouseholdScheduleUpdate): Promise<{ payload: HouseholdSchedule; etag: string }> {
    const response = await householdScheduleApi.put<ApiResponse<HouseholdSchedule>>('/household-schedule/', payload, {
      headers: { 'If-Match': etag },
    })
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async listVacationPeriods(): Promise<SchoolVacationPeriod[]> {
    const response = await householdScheduleApi.get<ApiResponse<SchoolVacationPeriod[]>>('/school-vacation-periods/')
    return unwrapApiResponse(response.data)
  },

  async createVacationPeriod(payload: SchoolVacationPeriodPayload): Promise<{ payload: SchoolVacationPeriod; etag: string }> {
    const response = await householdScheduleApi.post<ApiResponse<SchoolVacationPeriod>>('/school-vacation-periods/', payload)
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async updateVacationPeriod(
    uuid: string,
    etag: string,
    payload: SchoolVacationPeriodPayload,
  ): Promise<{ payload: SchoolVacationPeriod; etag: string }> {
    const response = await householdScheduleApi.put<ApiResponse<SchoolVacationPeriod>>(
      `/school-vacation-periods/${uuid}`,
      payload,
      { headers: { 'If-Match': etag } },
    )
    return { payload: unwrapApiResponse(response.data), etag: readEtag(response.headers) }
  },

  async removeVacationPeriod(uuid: string, etag: string): Promise<void> {
    await householdScheduleApi.delete(`/school-vacation-periods/${uuid}`, {
      headers: { 'If-Match': etag },
    })
  },
}
