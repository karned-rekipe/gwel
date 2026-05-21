<script setup lang="ts">
import { computed } from 'vue'
import type { MealPlanStatus } from '@/types/mealPlan'

const props = defineProps<{ status: MealPlanStatus; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'transition', status: MealPlanStatus): void }>()

const transitions = computed<Array<{ status: MealPlanStatus; label: string; variant: 'primary' | 'danger' | 'neutral' }>>(() => {
  if (props.status === 'draft') {
    return [
      { status: 'confirmed', label: 'Confirmer', variant: 'primary' },
      { status: 'abandoned', label: 'Abandonner', variant: 'danger' },
    ]
  }
  if (props.status === 'confirmed') {
    return [
      { status: 'done', label: 'Terminer', variant: 'primary' },
      { status: 'abandoned', label: 'Abandonner', variant: 'danger' },
    ]
  }
  return []
})
</script>

<template>
  <div class="transition-menu">
    <button
      v-for="transition in transitions"
      :key="transition.status"
      type="button"
      class="transition-menu__button"
      :class="`transition-menu__button--${transition.variant}`"
      :disabled="disabled"
      @click="emit('transition', transition.status)"
    >
      {{ transition.label }}
    </button>
  </div>
</template>

<style scoped>
.transition-menu {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.transition-menu__button {
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
}

.transition-menu__button--primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.transition-menu__button--danger {
  color: var(--color-danger);
}

.transition-menu__button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}
</style>
