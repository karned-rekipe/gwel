<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import IngredientDetailPanel from '@/components/ingredients/IngredientDetailPanel.vue'
import IngredientProfileEditor from '@/components/ingredients/IngredientProfileEditor.vue'
import ResourceLayerShell from '@/components/resources/ResourceLayerShell.vue'
import {
  useIngredient,
  useIngredientGroups,
  useIngredientRayons,
  useIngredients,
  useDeleteIngredient,
  useUpdateIngredient,
} from '@/composables/useCatalogQueries'
import type { Ingredient, IngredientPayload, Recipe } from '@/types/recipe'

const props = defineProps<{
  uuid: string
  fallbackTitle: string
  expanded: boolean
}>()

const emit = defineEmits<{
  close: []
  minimize: []
  titleChange: [title: string]
  updated: [ingredient: Ingredient]
  deleted: []
  openRecipe: [recipe: Recipe]
}>()

const mode = ref<'detail' | 'edit'>('detail')
const ingredientUuid = computed(() => props.uuid)
const { data: ingredient, isLoading, isError, error, refetch } = useIngredient(ingredientUuid)
const { data: ingredients } = useIngredients()
const { data: groups } = useIngredientGroups()
const { data: rayons } = useIngredientRayons()
const { mutate: updateIngredient, isPending: isSaving, error: saveError } = useUpdateIngredient()
const { mutate: deleteIngredient, isPending: isDeleting, error: deleteError } = useDeleteIngredient()
const title = computed(() => ingredient.value?.name || props.fallbackTitle)

watch(
  () => ingredient.value?.name,
  (name) => { if (name) emit('titleChange', name) },
  { immediate: true },
)

const save = (payload: Partial<IngredientPayload>): void => {
  updateIngredient(
    { uuid: props.uuid, data: payload },
    {
      onSuccess: (updated) => {
        emit('updated', updated)
        emit('titleChange', updated.name)
        mode.value = 'detail'
      },
    },
  )
}

const handleUpdated = (updated: Ingredient): void => {
  emit('updated', updated)
  if (updated.name !== title.value) emit('titleChange', updated.name)
}

const remove = (): void => {
  if (!ingredient.value || !window.confirm(`Supprimer définitivement « ${ingredient.value.name} » ?`)) return
  deleteIngredient(props.uuid, {
    onSuccess: () => {
      emit('deleted')
      emit('close')
    },
  })
}
</script>

<template>
  <ResourceLayerShell
    :title="title"
    resource-label="Fiche ingrédient"
    :expanded="expanded"
    :edit-mode="mode === 'edit'"
    @minimize="$emit('minimize')"
    @close="$emit('close')"
  >
    <div v-if="isLoading" class="ingredient-layer__state"><AppLoader variant="spinner" /><p>Chargement de l’ingrédient…</p></div>
    <div v-else-if="isError || !ingredient" class="ingredient-layer__state ingredient-layer__state--error">
      <h2>Chargement impossible</h2>
      <p>{{ error?.message || 'L’ingrédient n’est plus disponible.' }}</p>
      <button type="button" @click="refetch()">Réessayer</button>
    </div>
    <IngredientDetailPanel
      v-else-if="mode === 'detail'"
      :ingredient="ingredient"
      :ingredient-options="ingredients ?? []"
      @edit="mode = 'edit'"
      @updated="handleUpdated"
      @open-recipe="$emit('openRecipe', $event)"
    />
    <IngredientProfileEditor
      v-else
      :ingredient="ingredient"
      :ingredient-options="ingredients ?? []"
      :groups="groups ?? []"
      :rayons="rayons ?? []"
      :is-saving="isSaving"
      :is-deleting="isDeleting"
      :error="saveError?.message || deleteError?.message"
      @cancel="mode = 'detail'"
      @delete="remove"
      @save="save"
    />
  </ResourceLayerShell>
</template>

<style scoped>
.ingredient-layer__state { min-height: 55vh; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 32px; text-align: center; }
.ingredient-layer__state p, .ingredient-layer__state h2 { margin: 0; }
.ingredient-layer__state--error { color: var(--color-danger); }
.ingredient-layer__state button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); cursor: pointer; font: inherit; font-weight: 700; }
</style>
