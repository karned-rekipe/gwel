/**
 * Types pour l'application Recipe
 * Mode TypeScript strict - Zéro any
 * Aligné avec l'API backend
 */

// Types API (correspondant aux UUIDs de l'API)
export interface Ingredient {
  uuid: string
  name: string
  unit: string | null
}

export interface Step {
  uuid: string
  recipe_uuid: string
  name: string
  description: string
}

export interface Utensil {
  uuid: string
  name: string
}

export interface Recipe {
  uuid: string
  name: string
  description?: string
  nutriscore?: string | null
  ingredients?: Ingredient[]
  steps?: Step[]
  ustensils?: Utensil[]
}

// Types pour la création (sans UUID)
export interface CreateIngredientDTO {
  name: string
  unit: string
}

export interface CreateStepDTO {
  name: string
  description: string
}

export interface CreateUtensilDTO {
  name: string
}

export interface CreateRecipeDTO {
  name: string
  description?: string
}

export interface RecipeFormData {
  name: string
  description: string
  ingredients: CreateIngredientDTO[]
  steps: CreateStepDTO[]
  utensils: CreateUtensilDTO[]
}

// Réponses API
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface CreateResponse {
  uuid: string
}

export interface PurgeResponse {
  purged: number
}

// Types pour la création avec IA
export interface CreateRecipeWithAIDTO {
  raw_text: string
}

export interface AICreateResponse {
  uuid: string
}
