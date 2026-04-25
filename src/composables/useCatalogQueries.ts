import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { equipmentService } from '@/services/equipmentService'
import { ingredientGroupService, ingredientRayonService } from '@/services/ingredientSettingService'
import { ingredientService } from '@/services/ingredientService'
import { tagService } from '@/services/tagService'
import type { EquipmentPayload, IngredientPayload, IngredientSettingPayload, TagPayload } from '@/types/recipe'
import { recipeKeys } from '@/composables/useRecipeQueries'

export const ingredientKeys = {
  all: ['ingredients'] as const,
  lists: () => [...ingredientKeys.all, 'list'] as const,
  list: (name: string) => [...ingredientKeys.lists(), name] as const,
  detail: (uuid: string) => [...ingredientKeys.all, 'detail', uuid] as const,
  recipes: (uuid: string) => [...ingredientKeys.detail(uuid), 'recipes'] as const,
  duplicates: () => [...ingredientKeys.all, 'duplicates'] as const,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.detail(variables.uuid) })
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.detail(variables.uuid) })
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
