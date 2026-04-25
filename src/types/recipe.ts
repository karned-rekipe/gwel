export interface RecipeSource {
  name: string
  description?: string | null
  uri?: string | null
}

export interface Ingredient {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  rayon_uuid?: string | null
  group_uuid?: string | null
  rayon?: IngredientRayon | null
  group?: IngredientGroup | null
  green_score?: number | null
  unit?: string | null
  quantity?: number | null
  season_months: Record<number, number>
}

export interface IngredientPayload {
  name: string
  rayon_uuid?: string | null
  group_uuid?: string | null
  green_score?: number | null
  unit?: string | null
  quantity?: number | null
  season_months: Record<number, number>
}

export interface IngredientGroup {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  slug: string
  description?: string | null
  sort_order: number
}

export interface IngredientRayon {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  slug: string
  description?: string | null
  sort_order: number
}

export interface IngredientSettingPayload {
  name: string
  slug?: string | null
  description?: string | null
  sort_order?: number
}

export type TagCategory = 'diet' | 'occasion' | 'service' | 'technique' | 'other'

export interface Tag {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  slug: string
  category: TagCategory
  color?: string | null
}

export interface TagPayload {
  name: string
  slug?: string | null
  category: TagCategory
  color?: string | null
}

export interface Equipment {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  description?: string | null
}

export interface EquipmentPayload {
  name: string
  description?: string | null
}

export interface DuplicateItem {
  uuid: string
  name: string
}

export interface DuplicateGroup {
  normalized_name: string
  items: DuplicateItem[]
}

export interface DuplicateMergePayload {
  target_uuid: string
  duplicate_uuids: string[]
}

export interface DuplicateMergeResult {
  target_uuid: string
  merged_uuids: string[]
  updated_recipe_count: number
  deleted_count: number
}

export interface RecipeIngredient {
  ingredient_uuid: string
  name: string
  quantity: number
  unit: string
  season_months: Record<number, number>
  rayon_uuid?: string | null
  group_uuid?: string | null
  rayon?: IngredientRayon | null
  group?: IngredientGroup | null
  green_score?: number | null
}

export interface RecipeEquipment {
  equipment_uuid: string
  name: string
  quantity?: number | null
}

export interface RecipeStep {
  uuid?: string
  name: string
  description?: string | null
  cooking_time?: number | null
  rest_time?: number | null
  preparation_time?: number | null
  main_image?: string | null
  secondary_images: string[]
  rank: number
  total_time?: number
}

export type RecipeStatus = 'draft' | 'active' | 'archived'

export type RecipeQualityStatus = 'minimal' | 'text_only' | 'structured' | 'validated'

export type RecipeMigrationMetadata = Record<string, string | number | boolean | null>

export interface Recipe {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  description?: string | null
  origin_country?: string | null
  servings?: number | null
  unit_count?: number | null
  difficulty?: number | null
  price?: number | null
  main_image?: string | null
  secondary_images: string[]
  favorite: boolean
  tag_uuids: string[]
  tags: Tag[]
  season_months: Record<number, number>
  status: RecipeStatus
  quality_status: RecipeQualityStatus
  legacy_id?: number | null
  created_at_legacy?: string | null
  updated_at_legacy?: string | null
  migration_metadata: RecipeMigrationMetadata
  sources: RecipeSource[]
  ingredients: RecipeIngredient[]
  equipment: RecipeEquipment[]
  steps: RecipeStep[]
}

export interface RecipeCreatedResponse {
  uuid: string
}

export interface RecipeFormIngredient {
  ingredientUuid: string
  search: string
  quantity: string
  unit: string
}

export interface RecipeFormEquipment {
  equipmentUuid: string
  search: string
  quantity: string
}

export interface RecipeFormStep {
  name: string
  description: string
  preparationTime: string
  cookingTime: string
  restTime: string
}

export interface RecipeFormSource {
  name: string
  description: string
  uri: string
}

export interface RecipeFormData {
  name: string
  description: string
  servings: string
  originCountry: string
  difficulty: string
  price: string
  favorite: boolean
  tagUuids: string[]
  mainImage: string
  secondaryImages: string
  ingredients: RecipeFormIngredient[]
  equipment: RecipeFormEquipment[]
  steps: RecipeFormStep[]
  sources: RecipeFormSource[]
}

export interface RecipeCreatePayload {
  name: string
  description?: string | null
  origin_country?: string | null
  servings: number
  difficulty?: number | null
  price?: number | null
  main_image?: string | null
  secondary_images: string[]
  favorite?: boolean
  tag_uuids?: string[]
  status?: RecipeStatus
  quality_status?: RecipeQualityStatus
  legacy_id?: number | null
  created_at_legacy?: string | null
  updated_at_legacy?: string | null
  migration_metadata?: RecipeMigrationMetadata
  sources: RecipeSource[]
  ingredients: Array<{
    ingredient_uuid: string
    quantity: number
    unit: string
  }>
  equipment: Array<{
    equipment_uuid: string
    quantity?: number | null
  }>
  steps: RecipeStep[]
}

export interface CreateRecipeWithAIDTO {
  raw_text: string
}

export interface AICreateResponse {
  recipe_uuid: string
  recipe_name: string
  formatted_response: string
}
