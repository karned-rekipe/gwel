<script setup lang="ts">
import { computed } from 'vue'
import MealSlotCell from '@/components/planning/MealSlotCell.vue'
import type { MealPlanRead, MealSlot, SlotPatchOperation } from '@/types/mealPlan'

const props = defineProps<{
  plan: MealPlanRead
  mealLabels?: Record<string, string>
  readonly?: boolean
}>()

const emit = defineEmits<{
  (event: 'patch', operations: SlotPatchOperation[]): void
}>()

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

const days = computed<Array<{ date: string; label: string; meals: MealSlot[] }>>(() => {
  const grouped = new Map<string, MealSlot[]>()
  for (const slot of props.plan.slots) {
    const slots = grouped.get(slot.date)
    if (slots) {
      slots.push(slot)
    } else {
      grouped.set(slot.date, [slot])
    }
  }
  return Array.from(grouped.entries()).map(([date, slots]) => ({
    date,
    label: dayFormatter.format(new Date(`${date}T12:00:00`)),
    meals: slots,
  }))
})
</script>

<template>
  <section class="week-grid">
    <article v-for="day in days" :key="day.date" class="week-grid__day">
      <h2 class="week-grid__date">{{ day.label }}</h2>
      <div class="week-grid__meals">
        <MealSlotCell
          v-for="slot in day.meals"
          :key="`${slot.date}:${slot.slot_code}`"
          :slot="slot"
          :meal-label="mealLabels?.[slot.slot_code]"
          :readonly="readonly"
          @patch="emit('patch', $event)"
        />
      </div>
    </article>
  </section>
</template>

<style scoped>
.week-grid {
  display: grid;
  gap: 16px;
}

.week-grid__day {
  display: grid;
  gap: 10px;
}

.week-grid__meals {
  display: grid;
  gap: 10px;
}

.week-grid__date {
  display: grid;
  grid-template-columns: minmax(32px, 1fr) auto minmax(32px, 1fr);
  gap: 10px;
  align-items: center;
  margin: 0;
  font-size: 0.96rem;
  color: var(--color-text-secondary);
  text-align: center;
  text-transform: capitalize;
}

.week-grid__date::before,
.week-grid__date::after {
  content: "";
  border-top: 1px solid var(--color-border);
}

@media (max-width: 760px) {
  .week-grid__date {
    font-size: 1.05rem;
    color: var(--color-text-primary);
  }
}
</style>
