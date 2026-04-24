export interface ErrorDetail {
  type: string
  message: string
  field?: string | null
}

export interface ResponseMetadata {
  request_id?: string
  timestamp?: string
  version?: string
  duration_ms?: number | null
  links?: Record<string, string> | null
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T | null
  error?: ErrorDetail | null
  metadata?: ResponseMetadata
}

export interface PaginationInfo {
  total: number
  page: number
  per_page: number
  pages: number
  has_next: boolean
  has_prev: boolean
  next_page?: number | null
  prev_page?: number | null
}

export interface PaginatedResponse<T> {
  status: 'success'
  data: T[]
  pagination: PaginationInfo
  metadata?: ResponseMetadata
}
