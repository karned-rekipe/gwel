import type { ApiResponse, PaginatedResponse } from '@/types/api'

export type MealPlanStatus = 'draft' | 'confirmed' | 'done' | 'abandoned'
export type SlotCode = string
export type MealItemType = 'recipe' | 'ingredient' | 'note' | 'prep_task' | 'mixed'
export type HeadcountSource = 'household_schedule' | 'manual'

export interface RecipeSnapshotIngredient {
  ingredient_uuid: string
  name: string
  quantity: number
  unit: string
  season_months: number[]
  green_score?: number | null
  rayon?: string | null
  group?: string | null
}

export interface RecipeSnapshot {
  recipe_uuid: string
  title: string
  short_description?: string | null
  servings_default: number
  total_duration_min?: number | null
  ingredients: RecipeSnapshotIngredient[]
  snapshot_taken_at: string
  recipe_version?: number | null
}

export interface MealItem {
  uuid: string
  position: number
  item_type: MealItemType
  headcount?: number | null
  recipe_uuid?: string | null
  recipe_snapshot?: RecipeSnapshot | null
  recipe_status?: string | null
  recipe_modified: boolean
  ingredient_uuid?: string | null
  ingredient_name?: string | null
  ingredient_quantity?: number | null
  ingredient_unit?: string | null
  note?: string | null
  legacy_id?: number | null
}

export interface MealSlot {
  date: string
  slot_code: SlotCode
  headcount?: number | null
  headcount_source?: HeadcountSource | null
  items: MealItem[]
}

export interface MealPlanRead {
  uuid: string
  version: number
  created_at: string
  updated_at: string
  name: string
  status: MealPlanStatus
  date_start: string
  date_end: string
  slots: MealSlot[]
  migration_metadata?: Record<string, string | number | boolean | null> | null
}

export interface MealPlanSummary {
  uuid: string
  name: string
  status: MealPlanStatus
  date_start: string
  date_end: string
  items_count: number
  headcount_avg?: number | null
  version: number
}

export interface MealPlanCreate {
  name: string
  date_start: string
  date_end: string
  status?: MealPlanStatus
  initial_slots?: MealSlotPayload[] | null
}

export interface MealPlanUpdate {
  name: string
  date_start: string
  date_end: string
  status: MealPlanStatus
  slots: MealSlotPayload[]
}

export interface MealSlotPayload {
  date: string
  slot_code: SlotCode
  headcount?: number | null
  headcount_source?: HeadcountSource | null
  items: MealItemPayload[]
}

export interface MealItemPayload {
  uuid?: string | null
  position?: number | null
  item_type: MealItemType
  headcount?: number | null
  recipe_uuid?: string | null
  recipe_snapshot?: RecipeSnapshot | null
  ingredient_uuid?: string | null
  ingredient_name?: string | null
  ingredient_quantity?: number | null
  ingredient_unit?: string | null
  note?: string | null
  legacy_id?: number | null
}

export interface SlotPatchOperation {
  op: 'set_headcount' | 'add_item' | 'update_item' | 'remove_item' | 'reorder_items'
  slot_date: string
  slot_code: SlotCode
  headcount?: number | null
  item_uuid?: string | null
  item?: MealItemPayload | null
  new_positions?: Record<string, number> | null
}

export interface ShoppingProjectionLine {
  source_type: string
  source_uuid: string
  slot_date: string
  slot_code: SlotCode
  scaled_quantity: number
  unit: string
  scale_factor: number
  headcount?: number | null
}

export interface ShoppingProjectionIngredient {
  ingredient_uuid: string
  name?: string | null
  group?: string | null
  rayon?: string | null
  season_months: number[]
  lines: ShoppingProjectionLine[]
  aggregated: {
    quantity: number
    unit: string
  }
}

export interface ShoppingProjection {
  meal_plan_uuid: string
  period: { start: string; end: string }
  generated_at: string
  totals: {
    headcount_days: number
    ingredients_count: number
    groups_count: number
  }
  ingredients: ShoppingProjectionIngredient[]
  warnings: Array<{ code: string; ingredient_uuid?: string; details?: string }>
}

export type MealPlanApiResponse = ApiResponse<MealPlanRead>
export type MealPlanPage = PaginatedResponse<MealPlanSummary>
