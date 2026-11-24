<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLoader from '@/components/atoms/AppLoader.vue'
import IngredientDetailPanel from '@/components/ingredients/IngredientDetailPanel.vue'
import IngredientProfileEditor from '@/components/ingredients/IngredientProfileEditor.vue'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import {
  useIngredient,
  useDeleteIngredient,
  useIngredientGroups,
  useIngredientRayons,
  useIngredients,
  useUpdateIngredient,
} from '@/composables/useCatalogQueries'
import type { IngredientPayload } from '@/types/recipe'

const route = useRoute()
const router = useRouter()
const ingredientUuid = computed(() => route.params.id as string)
const mode = ref<'detail' | 'edit'>('detail')
const { data: ingredient, isLoading, isError, error } = useIngredient(ingredientUuid)
const { data: ingredients } = useIngredients()
const { data: groups } = useIngredientGroups()
const { data: rayons } = useIngredientRayons()
const { mutate: updateIngredient, isPending: isSaving, error: saveError } = useUpdateIngredient()
const { mutate: deleteIngredient, isPending: isDeleting, error: deleteError } = useDeleteIngredient()

const goBack = (): void => { router.push({ name: 'ingredients-home' }) }
const save = (payload: Partial<IngredientPayload>): void => {
  updateIngredient({ uuid: ingredientUuid.value, data: payload }, { onSuccess: () => { mode.value = 'detail' } })
}
const remove = (): void => {
  if (!ingredient.value || !window.confirm(`Supprimer définitivement « ${ingredient.value.name} » ?`)) return
  deleteIngredient(ingredientUuid.value, { onSuccess: goBack })
}
</script>

<template>
  <main class="catalog-route-detail">
    <header class="catalog-route-detail__toolbar">
      <IconActionButton label="Retour aux ingrédients" icon="←" show-label @click="goBack" />
    </header>
    <div v-if="isLoading" class="catalog-route-detail__state"><AppLoader variant="spinner" /><p>Chargement de l’ingrédient…</p></div>
    <div v-else-if="isError || !ingredient" class="catalog-route-detail__state catalog-route-detail__state--error"><h1>Ingrédient introuvable</h1><p>{{ error?.message || 'La fiche n’est pas disponible.' }}</p></div>
    <IngredientDetailPanel
      v-else-if="mode === 'detail'"
      :ingredient="ingredient"
      :ingredient-options="ingredients ?? []"
      @edit="mode = 'edit'"
      @open-recipe="router.push({ name: 'recipes-detail', params: { id: $event.uuid } })"
    />
    <div v-else class="catalog-route-detail__editor">
      <IngredientProfileEditor
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
    </div>
  </main>
</template>

<style scoped>
.catalog-route-detail { min-height: calc(100vh - 64px); background: #fbf8f1; }
.catalog-route-detail__toolbar { position: sticky; top: 61px; z-index: 20; padding: 9px clamp(18px,3vw,40px); border-bottom: 1px solid var(--color-border); background: rgba(255,255,255,.88); backdrop-filter: blur(16px); }
.catalog-route-detail__editor { padding: clamp(18px,3vw,40px); }
.catalog-route-detail__state { min-height: 60vh; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 32px; text-align: center; }
.catalog-route-detail__state h1, .catalog-route-detail__state p { margin: 0; }
.catalog-route-detail__state--error { color: var(--color-danger); }
</style>
