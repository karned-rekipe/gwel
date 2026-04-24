import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { aiRecipeService } from '@/services/aiRecipeService'
import { recipeService } from '@/services/recipeService'
import type { RecipeCreatePayload } from '@/types/recipe'

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...recipeKeys.details(), uuid] as const,
  search: (term: string) => [...recipeKeys.all, 'search', term] as const,
}

export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.lists(),
    queryFn: () => recipeService.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecipe(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: recipeKeys.detail(toValue(uuid)),
    queryFn: () => recipeService.getByUuid(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSearchRecipes(searchTerm: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: recipeKeys.search(toValue(searchTerm)),
    queryFn: () => recipeService.searchByName(toValue(searchTerm)),
    enabled: () => toValue(searchTerm).trim().length > 0,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecipeCreatePayload) => recipeService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<RecipeCreatePayload> }) =>
      recipeService.update(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(variables.uuid) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => recipeService.delete(uuid),
    onSuccess: (_, uuid) => {
      queryClient.removeQueries({ queryKey: recipeKeys.detail(uuid) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    },
  })
}

export function useDuplicateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => recipeService.duplicate(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
    },
  })
}

export function useCreateRecipeWithAI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rawText: string) => aiRecipeService.createRecipeWithAI(rawText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}
