<script setup lang="ts">
import { computed } from 'vue'
import MealSlotCell from '@/components/planning/MealSlotCell.vue'
import { formatMealLabel } from '@/components/planning/mealSlotLabels'
import type { MealPlanRead, MealSlot, SlotPatchOperation } from '@/types/mealPlan'

const props = defineProps<{
  plan: MealPlanRead
  mealLabels?: Record<string, string>
  visibleSlotCodes?: string[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  (event: 'patch', operations: SlotPatchOperation[]): void
}>()

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const dayNumberFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })

const addDays = (value: string, daysToAdd: number): string => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + daysToAdd)
  return date.toISOString().slice(0, 10)
}

const fallbackSlotCodes = computed(() => {
  const seen = new Set<string>()
  return props.plan.slots.flatMap((slot) => {
    if (seen.has(slot.slot_code)) return []
    seen.add(slot.slot_code)
    return [slot.slot_code]
  })
})

const slotCodes = computed(() => (
  props.visibleSlotCodes?.length ? props.visibleSlotCodes : fallbackSlotCodes.value
))

const days = computed<Array<{ date: string; label: string; shortLabel: string; dayNumber: string }>>(() => {
  if (!props.plan.date_start || !props.plan.date_end) return []
  const result: Array<{ date: string; label: string; shortLabel: string; dayNumber: string }> = []
  let cursor = props.plan.date_start
  while (cursor <= props.plan.date_end) {
    const parsed = new Date(`${cursor}T12:00:00`)
    result.push({
      date: cursor,
      label: dayFormatter.format(parsed),
      shortLabel: shortDayFormatter.format(parsed),
      dayNumber: dayNumberFormatter.format(parsed),
    })
    cursor = addDays(cursor, 1)
  }
  return result
})

const slotByKey = computed(() => {
  return new Map(props.plan.slots.map((slot) => [`${slot.date}:${slot.slot_code}`, slot] as const))
})

const emptySlot = (date: string, slotCode: string): MealSlot => ({
  date,
  slot_code: slotCode,
  headcount: null,
  headcount_source: null,
  items: [],
})

const mealSlotLabel = (slotCode: string): string => props.mealLabels?.[slotCode] ?? formatMealLabel(slotCode)

const mealSlotFor = (date: string, slotCode: string): MealSlot =>
  slotByKey.value.get(`${date}:${slotCode}`) ?? emptySlot(date, slotCode)
</script>

<template>
  <section class="week-grid">
    <div class="week-grid__scroller">
      <div
        class="week-grid__matrix"
        :style="{ gridTemplateColumns: `132px repeat(${days.length}, minmax(176px, 1fr))` }"
      >
        <div class="week-grid__corner" aria-hidden="true"></div>
        <header v-for="day in days" :key="day.date" class="week-grid__day-head" :title="day.label">
          <span>{{ day.shortLabel }}</span>
          <strong>{{ day.dayNumber }}</strong>
        </header>

        <template v-for="slotCode in slotCodes" :key="slotCode">
          <aside class="week-grid__meal-head">
            {{ mealSlotLabel(slotCode) }}
          </aside>
          <div
            v-for="day in days"
            :key="`${day.date}:${slotCode}`"
            class="week-grid__cell"
          >
            <MealSlotCell
              :slot="mealSlotFor(day.date, slotCode)"
              :meal-label="mealSlotLabel(slotCode)"
              :show-meal-label="false"
              :readonly="readonly"
              @patch="emit('patch', $event)"
            />
          </div>
        </template>
      </div>
      <p v-if="!slotCodes.length" class="week-grid__empty">Aucun type de repas à afficher.</p>
    </div>
  </section>
</template>

<style scoped>
.week-grid {
  width: 100%;
}

.week-grid__scroller {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-border);
}

.week-grid__matrix {
  display: grid;
  gap: 1px;
  min-width: 920px;
}

.week-grid__corner,
.week-grid__day-head,
.week-grid__meal-head,
.week-grid__cell {
  background: var(--color-surface);
}

.week-grid__corner,
.week-grid__day-head,
.week-grid__meal-head {
  position: sticky;
  z-index: 2;
}

.week-grid__corner {
  top: 0;
  left: 0;
  z-index: 4;
}

.week-grid__day-head {
  top: 0;
  min-height: 58px;
  display: grid;
  gap: 2px;
  align-content: center;
  justify-items: center;
  padding: 10px 8px;
  text-transform: capitalize;
}

.week-grid__day-head span {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
}

.week-grid__day-head strong {
  color: var(--color-text-primary);
  font-size: 1rem;
}

.week-grid__meal-head {
  left: 0;
  z-index: 3;
  min-height: 132px;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  font-weight: 700;
  text-transform: capitalize;
}

.week-grid__cell {
  min-height: 132px;
  padding: 8px;
}

.week-grid__empty {
  margin: 0;
  padding: 18px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

@media (max-width: 760px) {
  .week-grid__matrix {
    min-width: 760px;
  }

  .week-grid__cell {
    padding: 6px;
  }
}
</style>
