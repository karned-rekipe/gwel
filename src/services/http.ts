import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { appConfig } from '@/config/env'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

const ACCESS_TOKEN_STORAGE_KEY = 'rekipe.access_token'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toPlainString = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

const formatLocation = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((part) => toPlainString(part))
      .filter((part): part is string => !!part)
      .join('.')
  }

  return toPlainString(value) ?? ''
}

const formatValidationItem = (value: unknown): string | null => {
  const primitive = toPlainString(value)
  if (primitive) return primitive
  if (!isRecord(value)) return null

  const message =
    toPlainString(value.message) ??
    toPlainString(value.msg) ??
    toPlainString(value.reason) ??
    toPlainString(value.type)

  if (!message) return null

  const location = formatLocation(value.field ?? value.loc ?? value.path)
  return location ? `${location}: ${message}` : message
}

const formatApiErrorMessage = (payload: unknown): string | null => {
  const primitive = toPlainString(payload)
  if (primitive) return primitive

  if (Array.isArray(payload)) {
    const messages = payload
      .map((item) => formatValidationItem(item) ?? formatApiErrorMessage(item))
      .filter((message): message is string => !!message)

    return messages.length ? messages.join(' ; ') : null
  }

  if (!isRecord(payload)) return null

  const directMessage =
    toPlainString(payload.message) ??
    toPlainString(payload.msg) ??
    toPlainString(payload.reason) ??
    toPlainString(payload.title)

  if (directMessage) return directMessage

  const nestedMessage =
    formatApiErrorMessage(payload.detail) ??
    formatApiErrorMessage(payload.error) ??
    formatApiErrorMessage(payload.errors)

  if (nestedMessage) return nestedMessage

  try {
    const serialized = JSON.stringify(payload)
    return serialized === '{}' ? null : serialized
  } catch {
    return null
  }
}

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
    (error: AxiosError<unknown>) => {
      const apiMessage = formatApiErrorMessage(error.response?.data)
      const fallback = error.message || 'Erreur réseau'
      return Promise.reject(new Error(apiMessage || fallback))
    },
  )

  return client
}

export const unwrapApiResponse = <T>(payload: ApiResponse<T>): T => {
  if (payload.status !== 'success' || payload.data === undefined || payload.data === null) {
    const message = formatApiErrorMessage(payload.error) || 'Réponse API invalide'
    throw new Error(message)
  }

  return payload.data
}

export const unwrapPaginatedResponse = <T>(payload: PaginatedResponse<T>): T[] => payload.data
