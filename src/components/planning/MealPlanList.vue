<script setup lang="ts">
import PlanStatusBadge from '@/components/planning/PlanStatusBadge.vue'
import type { MealPlanSummary } from '@/types/mealPlan'

defineProps<{ items: MealPlanSummary[] }>()
</script>

<template>
  <div class="meal-plan-list">
    <router-link
      v-for="plan in items"
      :key="plan.uuid"
      class="meal-plan-list__row"
      :to="{ name: 'planning-detail', params: { uuid: plan.uuid } }"
    >
      <span>
        <strong>{{ plan.name }}</strong>
        <small>{{ plan.date_start }} → {{ plan.date_end }}</small>
      </span>
      <span>{{ plan.items_count }} item{{ plan.items_count > 1 ? 's' : '' }}</span>
      <PlanStatusBadge :status="plan.status" />
    </router-link>
  </div>
</template>

<style scoped>
.meal-plan-list {
  display: grid;
  gap: 10px;
}

.meal-plan-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.meal-plan-list__row span:first-child {
  display: grid;
  gap: 4px;
}

.meal-plan-list__row small,
.meal-plan-list__row > span:nth-child(2) {
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .meal-plan-list__row {
    grid-template-columns: 1fr;
  }
}
</style>
