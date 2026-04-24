import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { appConfig } from '@/config/env'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

const ACCESS_TOKEN_STORAGE_KEY = 'rekipe.access_token'

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-URI': appConfig.tenantUri,
  }

  if (!appConfig.authDisabled) {
    const token =
      window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ??
      window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return headers
}

export const createHttpClient = (baseURL: string, timeout = 10000): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout,
    headers: buildHeaders(),
  })

  client.interceptors.request.use((config) => {
    config.headers.set('X-Tenant-URI', appConfig.tenantUri)

    if (!appConfig.authDisabled) {
      const token =
        window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ??
        window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)

      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`)
      }
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ detail?: string }>) => {
      const apiMessage = error.response?.data?.detail
      const fallback = error.message || 'Erreur réseau'
      return Promise.reject(new Error(apiMessage || fallback))
    },
  )

  return client
}

export const unwrapApiResponse = <T>(payload: ApiResponse<T>): T => {
  if (payload.status !== 'success' || payload.data === undefined || payload.data === null) {
    const message = payload.error?.message || 'Réponse API invalide'
    throw new Error(message)
  }

  return payload.data
}

export const unwrapPaginatedResponse = <T>(payload: PaginatedResponse<T>): T[] => payload.data
