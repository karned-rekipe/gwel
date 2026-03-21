/**
 * Types pour l'application Recipe
 * Mode TypeScript strict - Zéro any
 */

export interface Ingredient {
  id: string
  name: string
  quantity: string
  unit: string
}

export interface Step {
  id: string
  order: number
  description: string
  duration?: number // en minutes, optionnel
}

export interface Utensil {
  id: string
  name: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  shortDescription: string
  ingredients: Ingredient[]
  steps: Step[]
  utensils: Utensil[]
  prepTime: number // en minutes
  cookTime: number // en minutes
  servings: number
  imageUrl?: string
  createdAt: string
}

export interface RecipeFormData {
  title: string
  description: string
  shortDescription: string
  ingredients: Omit<Ingredient, 'id'>[]
  steps: Omit<Step, 'id'>[]
  utensils: Omit<Utensil, 'id'>[]
  prepTime: number
  cookTime: number
  servings: number
  imageUrl?: string
}
