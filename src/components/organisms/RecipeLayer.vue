<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import RecipeDetail from '@/components/organisms/RecipeDetail.vue'
import RecipeForm from '@/components/organisms/RecipeForm.vue'
import ResourceLayerShell from '@/components/resources/ResourceLayerShell.vue'
import { useRecipe } from '@/composables/useRecipeQueries'

const props = defineProps<{
  uuid: string
  fallbackTitle: string
  expanded: boolean
}>()

const emit = defineEmits<{
  close: []
  minimize: []
  titleChange: [title: string]
}>()

const mode = ref<'detail' | 'edit'>('detail')
const recipeUuid = computed(() => props.uuid)
const { data: recipe, isLoading, isError, error, refetch } = useRecipe(recipeUuid)
const title = computed(() => recipe.value?.name || props.fallbackTitle)

watch(
  () => recipe.value?.name,
  (name) => { if (name) emit('titleChange', name) },
  { immediate: true },
)
</script>

<template>
  <ResourceLayerShell
    :title="title"
    resource-label="Fiche recette"
    :expanded="expanded"
    :edit-mode="mode === 'edit'"
    @minimize="$emit('minimize')"
    @close="$emit('close')"
  >
    <div v-if="isLoading" class="recipe-layer__state" aria-live="polite">
      <AppLoader variant="spinner" size="large" />
      <p>Chargement de la recette…</p>
    </div>
    <div v-else-if="isError || !recipe" class="recipe-layer__state recipe-layer__state--error">
      <h2>Chargement impossible</h2>
      <p>{{ error?.message || 'La recette n’est plus disponible.' }}</p>
      <button type="button" class="recipe-layer__retry" @click="refetch()">Réessayer</button>
    </div>
    <RecipeDetail
      v-else-if="mode === 'detail'"
      :recipe="recipe"
      embedded
      @back="$emit('minimize')"
      @edit="mode = 'edit'"
    />
    <RecipeForm
      v-else
      :key="recipe.uuid"
      mode="edit"
      :recipe="recipe"
      embedded
      @cancel="mode = 'detail'"
      @deleted="$emit('close')"
      @saved="mode = 'detail'"
    />
  </ResourceLayerShell>
</template>

<style scoped>
.recipe-layer__state { min-height: 55vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 32px; text-align: center; }
.recipe-layer__state h2, .recipe-layer__state p { margin: 0; }
.recipe-layer__state p { color: var(--color-text-secondary); }
.recipe-layer__state--error h2, .recipe-layer__state--error p { color: var(--color-danger); }
.recipe-layer__retry { min-height: 40px; padding: 8px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-primary); cursor: pointer; font: inherit; font-weight: 700; }
:deep(.recipe-form) { width: 100%; margin: 0 auto; }
</style>
