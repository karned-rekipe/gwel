import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { aiRecipeService } from '@/services/aiRecipeService'
import { recipeService, type RecipeListFilters } from '@/services/recipeService'
import { useRecipeCatalogStore } from '@/stores/recipeCatalogStore'
import type { Recipe, RecipeAIInput, RecipeCreatePayload } from '@/types/recipe'

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: string) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...recipeKeys.details(), uuid] as const,
  search: (term: string) => [...recipeKeys.all, 'search', term] as const,
}

const serializeFilters = (filters: RecipeListFilters): string => JSON.stringify(filters)

const refreshRecipeCatalog = (): void => {
  const recipeCatalog = useRecipeCatalogStore()
  recipeCatalog.markStale()
  void recipeCatalog.refresh({ force: true, foreground: false })
}

export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.lists(),
    queryFn: () => recipeService.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useInfiniteRecipes(filters: MaybeRefOrGetter<RecipeListFilters>) {
  return useInfiniteQuery({
    queryKey: computed(() => recipeKeys.list(serializeFilters(toValue(filters)))),
    queryFn: ({ pageParam, signal }) =>
      recipeService.getPage({
        ...toValue(filters),
        page: pageParam,
        per_page: toValue(filters).per_page ?? 24,
      }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.next_page ?? undefined,
    staleTime: 2 * 60 * 1000,
    retry: 1,
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
      refreshRecipeCatalog()
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
      refreshRecipeCatalog()
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
      refreshRecipeCatalog()
    },
  })
}

export function useDuplicateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => recipeService.duplicate(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      refreshRecipeCatalog()
    },
  })
}

export function useCreateRecipeWithAI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      allowDuplicate = false,
    }: {
      input: RecipeAIInput
      allowDuplicate?: boolean
    }) => aiRecipeService.createRecipeWithAI(input, allowDuplicate),
    onSuccess: (result) => {
      if (result.created) {
        queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
        queryClient.invalidateQueries({ queryKey: recipeKeys.all })
        refreshRecipeCatalog()
      }
    },
  })
}

export function useEnrichRecipeWithAI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipeUuid: string) => aiRecipeService.enrichExistingRecipe(recipeUuid),
    onSuccess: (_, recipeUuid) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeUuid) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      refreshRecipeCatalog()
    },
  })
}

export function useGenerateRecipeImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipe: Recipe) => recipeService.generateImage(
      recipe.uuid,
      undefined,
      Boolean(recipe.main_image?.trim()),
    ),
    onSuccess: (_, recipe) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipe.uuid) })
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      refreshRecipeCatalog()
    },
  })
}
