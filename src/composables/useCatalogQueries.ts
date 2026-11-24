import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { equipmentService } from '@/services/equipmentService'
import { ingredientEnrichmentAgentService } from '@/services/ingredientEnrichmentAgentService'
import { ingredientGroupService, ingredientRayonService } from '@/services/ingredientSettingService'
import { ingredientService } from '@/services/ingredientService'
import { tagService } from '@/services/tagService'
import { replaceEntityInCachedCollection } from '@/utils/entityCollections'
import {
  ingredientContentSuggestionFields,
  ingredientRunProposedImage,
} from '@/utils/ingredientEnrichment'
import { withIngredientImageSuggestionPreview } from '@/utils/ingredientImagePreview'
import type {
  EquipmentPayload,
  Ingredient,
  IngredientEnrichmentRunResult,
  IngredientEnrichmentSuggestionActionPayload,
  IngredientPayload,
  IngredientSettingPayload,
  TagPayload,
} from '@/types/recipe'
import { recipeKeys } from '@/composables/useRecipeQueries'

export const ingredientKeys = {
  all: ['ingredients'] as const,
  lists: () => [...ingredientKeys.all, 'list'] as const,
  list: (name: string) => [...ingredientKeys.lists(), name] as const,
  detail: (uuid: string) => [...ingredientKeys.all, 'detail', uuid] as const,
  recipes: (uuid: string) => [...ingredientKeys.detail(uuid), 'recipes'] as const,
  suggestions: (uuid: string) => [...ingredientKeys.detail(uuid), 'enrichment-suggestions'] as const,
  duplicates: () => [...ingredientKeys.all, 'duplicates'] as const,
  enrichmentRuns: (page: number) => ['ingredient-enrichment-runs', page] as const,
}

export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (name: string) => [...equipmentKeys.lists(), name] as const,
  detail: (uuid: string) => [...equipmentKeys.all, 'detail', uuid] as const,
  recipes: (uuid: string) => [...equipmentKeys.detail(uuid), 'recipes'] as const,
  duplicates: () => [...equipmentKeys.all, 'duplicates'] as const,
}

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (name: string) => [...tagKeys.lists(), name] as const,
  detail: (uuid: string) => [...tagKeys.all, 'detail', uuid] as const,
  recipes: (uuid: string) => [...tagKeys.detail(uuid), 'recipes'] as const,
}

export const settingKeys = {
  all: ['ingredient-settings'] as const,
  groups: () => [...settingKeys.all, 'groups'] as const,
  groupList: (name: string) => [...settingKeys.groups(), name] as const,
  rayons: () => [...settingKeys.all, 'rayons'] as const,
  rayonList: (name: string) => [...settingKeys.rayons(), name] as const,
}

const readIngredientWithSuggestionPreview = async (
  ingredientUuid: string,
  suggestionUuid?: string | null,
): Promise<Ingredient> => {
  const ingredient = await ingredientService.getByUuid(ingredientUuid)
  if (!suggestionUuid) return ingredient

  try {
    const suggestions = await ingredientService.listEnrichmentSuggestions(ingredientUuid)
    const suggestion = suggestions.find((item) => item.uuid === suggestionUuid)
    return withIngredientImageSuggestionPreview(ingredient, suggestion)
  } catch {
    // The enrichment succeeded; keep its refreshed data if the suggestion preview read fails.
    return ingredient
  }
}

const applyIngredientContentCompletion = async (
  run: IngredientEnrichmentRunResult,
): Promise<Ingredient> => {
  const contentFields = ingredientContentSuggestionFields(run)
  if (run.suggestion_uuid && contentFields.length) {
    await ingredientService.applyEnrichmentSuggestion(
      run.ingredient_uuid,
      run.suggestion_uuid,
      { fields: contentFields },
    )
  }
  if (run.suggestion_uuid && ingredientRunProposedImage(run)) {
    await ingredientService.rejectEnrichmentSuggestion(
      run.ingredient_uuid,
      run.suggestion_uuid,
      { fields: ['media_profile'] },
    )
  }
  return ingredientService.getByUuid(run.ingredient_uuid)
}

export function useIngredients(name: MaybeRefOrGetter<string> = '') {
  return useQuery({
    queryKey: computed(() => ingredientKeys.list(toValue(name))),
    queryFn: () => ingredientService.getAll(toValue(name).trim() || undefined),
    staleTime: 5 * 60 * 1000,
  })
}

export function useIngredient(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ingredientKeys.detail(toValue(uuid))),
    queryFn: () => ingredientService.getByUuid(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 5 * 60 * 1000,
  })
}

export function useIngredientRecipes(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ingredientKeys.recipes(toValue(uuid))),
    queryFn: () => ingredientService.getRecipes(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 2 * 60 * 1000,
  })
}

export function useIngredientEnrichmentSuggestions(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ingredientKeys.suggestions(toValue(uuid))),
    queryFn: () => ingredientService.listEnrichmentSuggestions(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 30 * 1000,
  })
}

export function useCreateIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IngredientPayload) => ingredientService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<IngredientPayload> }) =>
      ingredientService.update(uuid, data),
    onSuccess: (ingredient, variables) => {
      queryClient.setQueryData(ingredientKeys.detail(variables.uuid), ingredient)
      queryClient.setQueriesData(
        { queryKey: ingredientKeys.lists() },
        (cached) => replaceEntityInCachedCollection(cached, ingredient),
      )
      queryClient.invalidateQueries({ queryKey: ingredientKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => ingredientService.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

export function useRunIngredientEnrichment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ingredientUuid: string) => {
      const run = await ingredientEnrichmentAgentService.enrichIngredient(ingredientUuid)
      const ingredient = await applyIngredientContentCompletion(run)
      return { run, ingredient }
    },
    onSuccess: (result, ingredientUuid) => {
      queryClient.setQueryData(ingredientKeys.detail(ingredientUuid), result.ingredient)
      queryClient.setQueriesData(
        { queryKey: ingredientKeys.lists() },
        (cached) => replaceEntityInCachedCollection(cached, result.ingredient),
      )
      queryClient.invalidateQueries({ queryKey: ingredientKeys.suggestions(ingredientUuid) })
    },
  })
}

export function useGenerateIngredientImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ingredientUuid: string) => {
      const run = await ingredientService.generateImage(ingredientUuid)
      const ingredient = await readIngredientWithSuggestionPreview(ingredientUuid, run.suggestion_uuid)
      return { run, ingredient }
    },
    onSuccess: (result, ingredientUuid) => {
      queryClient.setQueryData(ingredientKeys.detail(ingredientUuid), result.ingredient)
      queryClient.setQueriesData(
        { queryKey: ingredientKeys.lists() },
        (cached) => replaceEntityInCachedCollection(cached, result.ingredient),
      )
      queryClient.invalidateQueries({ queryKey: ingredientKeys.suggestions(ingredientUuid) })
    },
  })
}

export function useRunIngredientEnrichmentBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { ingredientUuids: string[]; limit?: number; continueOnError?: boolean }) => {
      const runs = await ingredientEnrichmentAgentService.enrichBatch({
        ingredient_uuids: payload.ingredientUuids,
        limit: payload.limit ?? payload.ingredientUuids.length,
        continue_on_error: payload.continueOnError ?? true,
      })
      const ingredients = (await Promise.all(runs.map(async (run) => {
        try {
          return await applyIngredientContentCompletion(run)
        } catch {
          return null
        }
      }))).filter((ingredient): ingredient is Ingredient => ingredient !== null)

      return { runs, ingredients }
    },
    onSuccess: (result) => {
      result.ingredients.forEach((ingredient) => {
        queryClient.setQueryData(ingredientKeys.detail(ingredient.uuid), ingredient)
        queryClient.setQueriesData(
          { queryKey: ingredientKeys.lists() },
          (cached) => replaceEntityInCachedCollection(cached, ingredient),
        )
        queryClient.invalidateQueries({ queryKey: ingredientKeys.suggestions(ingredient.uuid) })
      })
    },
  })
}

export function useIngredientEnrichmentRuns(page: MaybeRefOrGetter<number> = 1) {
  return useQuery({
    queryKey: computed(() => ingredientKeys.enrichmentRuns(toValue(page))),
    queryFn: () => ingredientEnrichmentAgentService.listRuns({ page: toValue(page), per_page: 50 }),
    staleTime: 15 * 1000,
  })
}

export function useApplyIngredientEnrichmentSuggestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ingredientUuid,
      suggestionUuid,
      payload,
    }: {
      ingredientUuid: string
      suggestionUuid: string
      payload: IngredientEnrichmentSuggestionActionPayload
    }) => ingredientService.applyEnrichmentSuggestion(ingredientUuid, suggestionUuid, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.detail(variables.ingredientUuid) })
      queryClient.invalidateQueries({ queryKey: ingredientKeys.suggestions(variables.ingredientUuid) })
      queryClient.invalidateQueries({ queryKey: ingredientKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useRejectIngredientEnrichmentSuggestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ingredientUuid,
      suggestionUuid,
      payload,
    }: {
      ingredientUuid: string
      suggestionUuid: string
      payload?: IngredientEnrichmentSuggestionActionPayload
    }) => ingredientService.rejectEnrichmentSuggestion(ingredientUuid, suggestionUuid, payload ?? {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.detail(variables.ingredientUuid) })
      queryClient.invalidateQueries({ queryKey: ingredientKeys.suggestions(variables.ingredientUuid) })
      queryClient.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
  })
}

export function useIngredientDuplicates() {
  return useQuery({
    queryKey: ingredientKeys.duplicates(),
    queryFn: () => ingredientService.getDuplicates(),
    staleTime: 30 * 1000,
  })
}

export function useMergeIngredientDuplicates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { target_uuid: string; duplicate_uuids: string[] }) =>
      ingredientService.mergeDuplicates(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useEquipment(name: MaybeRefOrGetter<string> = '') {
  return useQuery({
    queryKey: computed(() => equipmentKeys.list(toValue(name))),
    queryFn: () => equipmentService.getAll(toValue(name).trim() || undefined),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEquipmentItem(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => equipmentKeys.detail(toValue(uuid))),
    queryFn: () => equipmentService.getByUuid(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEquipmentRecipes(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => equipmentKeys.recipes(toValue(uuid))),
    queryFn: () => equipmentService.getRecipes(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EquipmentPayload) => equipmentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all })
    },
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<EquipmentPayload> }) =>
      equipmentService.update(uuid, data),
    onSuccess: (equipment, variables) => {
      queryClient.setQueryData(equipmentKeys.detail(variables.uuid), equipment)
      queryClient.setQueriesData(
        { queryKey: equipmentKeys.lists() },
        (cached) => replaceEntityInCachedCollection(cached, equipment),
      )
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => equipmentService.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all })
    },
  })
}

export function useGenerateEquipmentImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, replaceExisting = false }: { uuid: string; replaceExisting?: boolean }) =>
      equipmentService.generateImage(uuid, replaceExisting),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(equipmentKeys.detail(variables.uuid), result.equipment)
      queryClient.setQueriesData(
        { queryKey: equipmentKeys.lists() },
        (cached) => replaceEntityInCachedCollection(cached, result.equipment),
      )
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() })
    },
  })
}

export function useEquipmentDuplicates() {
  return useQuery({
    queryKey: equipmentKeys.duplicates(),
    queryFn: () => equipmentService.getDuplicates(),
    staleTime: 30 * 1000,
  })
}

export function useMergeEquipmentDuplicates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { target_uuid: string; duplicate_uuids: string[] }) =>
      equipmentService.mergeDuplicates(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useTags(name: MaybeRefOrGetter<string> = '') {
  return useQuery({
    queryKey: computed(() => tagKeys.list(toValue(name))),
    queryFn: () => tagService.getAll(toValue(name).trim() || undefined),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTag(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => tagKeys.detail(toValue(uuid))),
    queryFn: () => tagService.getByUuid(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTagRecipes(uuid: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => tagKeys.recipes(toValue(uuid))),
    queryFn: () => tagService.getRecipes(toValue(uuid)),
    enabled: () => !!toValue(uuid),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TagPayload) => tagService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<TagPayload> }) => tagService.update(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(variables.uuid) })
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => tagService.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}

export function useIngredientGroups(name: MaybeRefOrGetter<string> = '') {
  return useQuery({
    queryKey: computed(() => settingKeys.groupList(toValue(name))),
    queryFn: () => ingredientGroupService.getAll(toValue(name).trim() || undefined),
    staleTime: 5 * 60 * 1000,
  })
}

export function useIngredientRayons(name: MaybeRefOrGetter<string> = '') {
  return useQuery({
    queryKey: computed(() => settingKeys.rayonList(toValue(name))),
    queryFn: () => ingredientRayonService.getAll(toValue(name).trim() || undefined),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateIngredientGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IngredientSettingPayload) => ingredientGroupService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.groups() })
    },
  })
}

export function useUpdateIngredientGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<IngredientSettingPayload> }) =>
      ingredientGroupService.update(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.groups() })
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

export function useDeleteIngredientGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => ingredientGroupService.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.groups() })
    },
  })
}

export function useCreateIngredientRayon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IngredientSettingPayload) => ingredientRayonService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.rayons() })
    },
  })
}

export function useUpdateIngredientRayon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<IngredientSettingPayload> }) =>
      ingredientRayonService.update(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.rayons() })
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all })
    },
  })
}

export function useDeleteIngredientRayon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => ingredientRayonService.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.rayons() })
    },
  })
}
