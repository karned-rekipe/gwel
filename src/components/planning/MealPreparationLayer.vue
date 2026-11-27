<script setup lang="ts">
import { computed, watch } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import MealPreparationDetail from '@/components/planning/MealPreparationDetail.vue'
import ResourceLayerShell from '@/components/resources/ResourceLayerShell.vue'
import { useRecipe } from '@/composables/useRecipeQueries'
import { useScreenWakeLock } from '@/composables/useScreenWakeLock'
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
const {
  errorMessage: wakeLockError,
  isActive: isWakeLockActive,
  isSupported: isWakeLockSupported,
  secureContext,
  status: wakeLockStatus,
  toggle: toggleWakeLock,
} = useScreenWakeLock(true)
const wakeLockLabel = computed(() => {
  if (isWakeLockActive.value) return 'Maintien de l’écran actif'
  if (!isWakeLockSupported.value) return 'Maintien de l’écran indisponible'
  if (wakeLockStatus.value === 'error') return 'Réessayer le maintien de l’écran'
  if (wakeLockStatus.value === 'activating') return 'Activation du maintien de l’écran'
  return 'Garder l’écran allumé'
})
const wakeLockHint = computed(() => {
  if (!secureContext) return 'Disponible lorsque Rekipe est ouvert en HTTPS.'
  if (!isWakeLockSupported.value) return 'Ce navigateur ne prend pas en charge cette fonction.'
  return wakeLockError.value ?? wakeLockLabel.value
})

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
    <template #header-actions>
      <button
        type="button"
        class="meal-preparation-layer__wake-lock"
        :class="{
          'is-active': isWakeLockActive,
          'is-activating': wakeLockStatus === 'activating',
          'is-error': wakeLockStatus === 'error',
        }"
        :aria-pressed="isWakeLockActive"
        :aria-label="wakeLockLabel"
        :disabled="!isWakeLockSupported"
        :title="wakeLockHint"
        @click="toggleWakeLock"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2.75" y="5.25" width="14.5" height="11.5" rx="2.25" />
          <path d="M7 20h6M10 16.75V20" />
          <circle cx="18.25" cy="6" r="2.15" />
          <path class="meal-preparation-layer__wake-lock-rays" d="M18.25 1.75v1.1M18.25 9.15v1.1M22.5 6h-1.1M15.1 6H14M21.25 3l-.8.8M16.05 8.2l-.8.8M21.25 9l-.8-.8M16.05 3.8l-.8-.8" />
          <path v-if="!isWakeLockSupported" class="meal-preparation-layer__wake-lock-slash" d="M3 3l18 18" />
        </svg>
      </button>
    </template>
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
.meal-preparation-layer__wake-lock {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: #6f4a2b;
  cursor: pointer;
}

.meal-preparation-layer__wake-lock svg {
  width: 20px;
  height: 20px;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.65;
}

.meal-preparation-layer__wake-lock:hover:not(:disabled) { background: #f3e8da; }
.meal-preparation-layer__wake-lock:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
.meal-preparation-layer__wake-lock.is-active {
  border-color: #52705d;
  background: #edf4ef;
  color: #365342;
}
.meal-preparation-layer__wake-lock.is-error { color: var(--color-danger); }
.meal-preparation-layer__wake-lock:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}
.meal-preparation-layer__wake-lock-slash { stroke-width: 2.2; }
.meal-preparation-layer__wake-lock.is-activating .meal-preparation-layer__wake-lock-rays {
  transform-origin: 18.25px 6px;
  animation: meal-preparation-wake-lock 900ms linear infinite;
}

@keyframes meal-preparation-wake-lock {
  to { transform: rotate(360deg); }
}

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
