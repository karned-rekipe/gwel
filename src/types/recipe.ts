/**
 * Types pour l'application Recipe
 * Mode TypeScript strict - Zéro any
 * Aligné avec l'API backend
 */

// Types API (correspondant aux UUIDs de l'API)
export interface Ingredient {
  uuid: string
  name: string
  unit: string
}

export interface Step {
  uuid: string
  name: string
  description: string
  order?: number
}

export interface Utensil {
  uuid: string
  name: string
}

export interface Recipe {
  uuid: string
  name: string
  description?: string
  shortDescription?: string
  prepTime?: number // en minutes
  cookTime?: number // en minutes
  servings?: number
  imageUrl?: string
  createdAt?: string
  ingredients?: Ingredient[]
  steps?: Step[]
  utensils?: Utensil[]
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
  shortDescription?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  imageUrl?: string
}

export interface RecipeFormData {
  name: string
  description: string
  shortDescription: string
  ingredients: CreateIngredientDTO[]
  steps: CreateStepDTO[]
  utensils: CreateUtensilDTO[]
  prepTime: number
  cookTime: number
  servings: number
  imageUrl?: string
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
