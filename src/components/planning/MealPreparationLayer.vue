<script setup lang="ts">
import { computed, watch } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import MealPreparationDetail from '@/components/planning/MealPreparationDetail.vue'
import ResourceLayerShell from '@/components/resources/ResourceLayerShell.vue'
import { useRecipe } from '@/composables/useRecipeQueries'
import type { HouseholdMember } from '@/types/householdMember'
import type { MealItem, RecipePreparationProgress } from '@/types/mealPlan'

const props = defineProps<{
  recipeUuid: string
  item: MealItem
  fallbackTitle: string
  fallbackMemberIds: string[]
  fallbackHeadcount?: number | null
  householdMembers: HouseholdMember[]
  expanded: boolean
}>()

const emit = defineEmits<{
  close: []
  minimize: []
  titleChange: [title: string]
  progressChange: [progress: RecipePreparationProgress]
}>()

const recipeUuid = computed(() => props.recipeUuid)
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
    resource-label="Réalisation du repas"
    :expanded="expanded"
    @minimize="$emit('minimize')"
    @close="$emit('close')"
  >
    <div v-if="isLoading" class="meal-preparation-layer__state" aria-live="polite">
      <AppLoader variant="spinner" size="large" />
      <p>Chargement de la recette à réaliser…</p>
    </div>
    <div v-else-if="isError || !recipe" class="meal-preparation-layer__state meal-preparation-layer__state--error">
      <h2>Chargement impossible</h2>
      <p>{{ error?.message || 'La recette n’est plus disponible.' }}</p>
      <button type="button" @click="refetch()">Réessayer</button>
    </div>
    <MealPreparationDetail
      v-else
      :recipe="recipe"
      :item="item"
      :household-members="householdMembers"
      :fallback-member-ids="fallbackMemberIds"
      :fallback-headcount="fallbackHeadcount"
      @progress-change="$emit('progressChange', $event)"
    />
  </ResourceLayerShell>
</template>

<style scoped>
.meal-preparation-layer__state {
  min-height: 55vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px;
  text-align: center;
}

.meal-preparation-layer__state h2,
.meal-preparation-layer__state p { margin: 0; }
.meal-preparation-layer__state p { color: var(--color-text-secondary); }
.meal-preparation-layer__state--error h2,
.meal-preparation-layer__state--error p { color: var(--color-danger); }
.meal-preparation-layer__state button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
</style>
