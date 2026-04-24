export interface RecipeSource {
  name: string
  description?: string | null
  uri?: string | null
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
  season_months: Record<number, number>
  rayon?: string | null
  group?: string | null
  green_score?: number | null
}

export interface RecipeEquipment {
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

export interface Recipe {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  description?: string | null
  servings?: number | null
  unit_count?: number | null
  difficulty?: number | null
  price?: number | null
  main_image?: string | null
  secondary_images: string[]
  sources: RecipeSource[]
  ingredients: RecipeIngredient[]
  equipment: RecipeEquipment[]
  steps: RecipeStep[]
}

export interface RecipeCreatedResponse {
  uuid: string
}

export interface RecipeFormIngredient {
  name: string
  quantity: string
  unit: string
  seasonMonths: number[]
  rayon: string
  group: string
  greenScore: string
}

export interface RecipeFormEquipment {
  name: string
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
  servings: number
  main_image?: string | null
  secondary_images: string[]
  sources: RecipeSource[]
  ingredients: RecipeIngredient[]
  equipment: RecipeEquipment[]
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
