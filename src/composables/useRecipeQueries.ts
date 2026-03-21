import { useQuery, useMutation, useQueryClient, type MaybeRefOrGetter } from '@tanstack/vue-query'
import { recipeService } from '@/services/recipeService'
import type { Recipe, CreateRecipeDTO, CreateIngredientDTO, CreateStepDTO, CreateUtensilDTO } from '@/types/recipe'
import { toValue } from 'vue'

/**
 * Composables Vue Query pour les recettes
 * Gestion centralisée des query keys, du cache et des mutations
 */

// ==================== QUERY KEYS ====================
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...recipeKeys.details(), uuid] as const,
  search: (term: string) => [...recipeKeys.all, 'search', term] as const
}

// ==================== QUERIES (GET) ====================

/**
 * Hook pour récupérer toutes les recettes
 */
export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.lists(),
    queryFn: () => recipeService.getAll(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Hook pour récupérer une recette par UUID
 */
export function useRecipe(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: recipeKeys.detail(toValue(uuid)),
    queryFn: () => recipeService.getByUuid(toValue(uuid)),
    enabled: () => !!toValue(uuid), // Ne s'exécute que si l'UUID existe
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Hook pour rechercher des recettes par nom
 */
export function useSearchRecipes(searchTerm: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: recipeKeys.search(toValue(searchTerm)),
    queryFn: () => recipeService.searchByName(toValue(searchTerm)),
    enabled: () => toValue(searchTerm).trim().length > 0, // Ne s'exécute que si le terme existe
    staleTime: 2 * 60 * 1000 // 2 minutes pour les recherches
  })
}

// ==================== MUTATIONS (POST/PUT/DELETE) ====================

/**
 * Hook pour créer une nouvelle recette
 */
export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      recipe: CreateRecipeDTO
      ingredients: CreateIngredientDTO[]
      steps: CreateStepDTO[]
      utensils: CreateUtensilDTO[]
    }) => recipeService.create(data),
    onSuccess: () => {
      // Invalide le cache des listes pour forcer un rafraîchissement
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    }
  })
}

/**
 * Hook pour mettre à jour une recette
 */
export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<Recipe> }) =>
      recipeService.update(uuid, data),
    onSuccess: (_, variables) => {
      // Invalide la recette spécifique et la liste
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(variables.uuid) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    }
  })
}

/**
 * Hook pour supprimer une recette
 */
export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => recipeService.delete(uuid),
    onSuccess: (_, uuid) => {
      // Supprime la recette du cache et invalide les listes
      queryClient.removeQueries({ queryKey: recipeKeys.detail(uuid) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    }
  })
}

/**
 * Hook pour dupliquer une recette
 */
export function useDuplicateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => recipeService.duplicate(uuid),
    onSuccess: () => {
      // Invalide toutes les listes pour afficher la nouvelle recette
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    }
  })
}
