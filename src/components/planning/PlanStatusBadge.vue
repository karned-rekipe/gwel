<script setup lang="ts">
import type { MealPlanStatus } from '@/types/mealPlan'

defineProps<{ status: MealPlanStatus }>()

const labels: Record<MealPlanStatus, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmé',
  done: 'Terminé',
  abandoned: 'Abandonné',
}
</script>

<template>
  <span class="status-badge" :class="`status-badge--${status}`">{{ labels[status] }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 650;
}

.status-badge--draft {
  color: #545454;
  background: #ececf0;
}

.status-badge--confirmed {
  color: #005bb5;
  background: rgba(0, 113, 227, 0.1);
}

.status-badge--done {
  color: var(--color-success);
  background: rgba(36, 138, 61, 0.1);
}

.status-badge--abandoned {
  color: var(--color-danger);
  background: rgba(215, 0, 21, 0.1);
}
</style>
