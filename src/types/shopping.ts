import type { ApiResponse, PaginatedResponse } from '@/types/api'

export type ShoppingListStatus = 'draft' | 'to_check' | 'validated' | 'in_progress' | 'done'
export type SupplierType = 'store' | 'producer' | 'online' | 'other'

export interface ShoppingSourceLine {
  source_type: string
  source_uuid: string
  slot_date?: string | null
  slot_code?: string | null
  scaled_quantity: number
  unit: string
  scale_factor: number
  headcount?: number | null
}

export interface ShoppingWarning {
  code: string
  ingredient_uuid?: string | null
  details?: string | null
}

export interface ShoppingItem {
  uuid: string
  name: string
  ingredient_uuid?: string | null
  quantity?: number | null
  unit?: string | null
  rayon?: string | null
  group?: string | null
  supplier_uuid?: string | null
  checked: boolean
  manual: boolean
  note?: string | null
  source_key?: string | null
  lines: ShoppingSourceLine[]
}

export interface ShoppingList {
  uuid: string
  version: number
  created_at: string
  updated_at: string
  name: string
  status: ShoppingListStatus
  meal_plan_uuid?: string | null
  source_meal_plan_uuids: string[]
  period_start?: string | null
  period_end?: string | null
  generated_at?: string | null
  items: ShoppingItem[]
  warnings: ShoppingWarning[]
}

export interface ShoppingListSummary extends ShoppingList {}

export interface ShoppingListCreate {
  name: string
}

export interface ShoppingListFromMealPlan {
  meal_plan_uuid: string
  name?: string | null
}

export interface ShoppingListFromPeriod {
  date_start: string
  date_end: string
  name?: string | null
}

export interface ShoppingItemCreate {
  ingredient_uuid?: string | null
  name: string
  quantity?: number | null
  unit?: string | null
  rayon?: string | null
  group?: string | null
  supplier_uuid?: string | null
  checked?: boolean
  note?: string | null
}

export interface ShoppingItemPatch {
  ingredient_uuid?: string | null
  name?: string
  quantity?: number | null
  unit?: string | null
  rayon?: string | null
  group?: string | null
  supplier_uuid?: string | null
  checked?: boolean
  note?: string | null
}

export interface ShoppingExportRequest {
  item_uuids?: string[] | null
  rayon?: string | null
  supplier_uuid?: string | null
  include_checked: boolean
}

export interface ShoppingExportResult {
  text: string
  item_count: number
}

export interface Supplier {
  uuid: string
  version: number
  created_at: string
  updated_at: string
  name: string
  supplier_type: SupplierType
  notes?: string | null
}

export interface SupplierCreate {
  name: string
  supplier_type: SupplierType
  notes?: string | null
}

export type SupplierPatch = Partial<SupplierCreate>

export type ShoppingListResponse = ApiResponse<ShoppingList>
export type ShoppingListPage = PaginatedResponse<ShoppingList>
export type SupplierPage = PaginatedResponse<Supplier>
