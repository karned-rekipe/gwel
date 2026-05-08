<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MealSlotCell from '@/components/planning/MealSlotCell.vue'
import { formatMealLabel } from '@/components/planning/mealSlotLabels'
import type { MealPlanRead, MealSlot, SlotPatchOperation } from '@/types/mealPlan'

const props = defineProps<{
  plan: MealPlanRead
  mealLabels?: Record<string, string>
  visibleSlotCodes?: string[]
  loading?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  (event: 'patch', operations: SlotPatchOperation[]): void
  (event: 'extend-period', side: 'before' | 'after'): void
}>()

const scroller = ref<HTMLElement | null>(null)
const collapsedSlotCodes = ref<string[]>([])
const mealHeadWidth = 104
const dayColumnWidth = 184

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const dayNumberFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })

const isoFromDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayIso = isoFromDate(new Date())

const addDays = (value: string, daysToAdd: number): string => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + daysToAdd)
  return date.toISOString().slice(0, 10)
}

const easterSunday = (year: number): Date => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day, 12)
}

const frenchHolidayLabel = (date: Date): string | null => {
  const year = date.getFullYear()
  const iso = isoFromDate(date)
  const fixedHolidays: Record<string, string> = {
    [`${year}-01-01`]: "Jour de l'an",
    [`${year}-05-01`]: 'Fête du travail',
    [`${year}-05-08`]: 'Victoire 1945',
    [`${year}-07-14`]: 'Fête nationale',
    [`${year}-08-15`]: 'Assomption',
    [`${year}-11-01`]: 'Toussaint',
    [`${year}-11-11`]: 'Armistice',
    [`${year}-12-25`]: 'Noël',
  }
  if (fixedHolidays[iso]) return fixedHolidays[iso]

  const easter = easterSunday(year)
  const movableHolidays = new Map([
    [isoFromDate(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1, 12)), 'Lundi de Pâques'],
    [isoFromDate(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 39, 12)), 'Ascension'],
    [isoFromDate(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 50, 12)), 'Lundi de Pentecôte'],
  ])
  return movableHolidays.get(iso) ?? null
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

const days = computed<Array<{
  date: string
  label: string
  shortLabel: string
  dayNumber: string
  holidayLabel: string | null
  isToday: boolean
  isWeekend: boolean
}>>(() => {
  if (!props.plan.date_start || !props.plan.date_end) return []
  const result: Array<{
    date: string
    label: string
    shortLabel: string
    dayNumber: string
    holidayLabel: string | null
    isToday: boolean
    isWeekend: boolean
  }> = []
  let cursor = props.plan.date_start
  while (cursor <= props.plan.date_end) {
    const parsed = new Date(`${cursor}T12:00:00`)
    const day = parsed.getDay()
    result.push({
      date: cursor,
      label: dayFormatter.format(parsed),
      shortLabel: shortDayFormatter.format(parsed),
      dayNumber: dayNumberFormatter.format(parsed),
      holidayLabel: frenchHolidayLabel(parsed),
      isToday: cursor === todayIso,
      isWeekend: day === 0 || day === 6,
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

const isSlotCollapsed = (slotCode: string): boolean => collapsedSlotCodes.value.includes(slotCode)

const toggleSlotCollapse = (slotCode: string): void => {
  if (isSlotCollapsed(slotCode)) {
    collapsedSlotCodes.value = collapsedSlotCodes.value.filter((code) => code !== slotCode)
  } else {
    collapsedSlotCodes.value = [...collapsedSlotCodes.value, slotCode]
  }
}

const gridTemplateRows = computed(() => {
  const rows = slotCodes.value.map((slotCode) => (isSlotCollapsed(slotCode) ? '38px' : 'minmax(0, 1fr)'))
  return `50px ${rows.join(' ')}`
})

const scrollTodayIntoView = async (): Promise<void> => {
  await nextTick()
  const scrollerElement = scroller.value
  const todayHead = scrollerElement?.querySelector<HTMLElement>('.week-grid__day-head--today')
  if (!scrollerElement || !todayHead) return

  scrollerElement.scrollLeft = Math.max(todayHead.offsetLeft - mealHeadWidth, 0)
}

watch(
  () => [props.plan.date_start, props.plan.date_end, days.value.length],
  () => {
    void scrollTodayIntoView()
  },
  { immediate: true },
)

onMounted(() => {
  void scrollTodayIntoView()
})
</script>

<template>
  <section class="week-grid">
    <button
      type="button"
      class="week-grid__load week-grid__load--before"
      :disabled="loading"
      aria-label="Charger les jours précédents"
      title="Charger les jours précédents"
      @click="emit('extend-period', 'before')"
    >
      <span aria-hidden="true">←</span>
    </button>

    <div ref="scroller" class="week-grid__scroller">
      <div
        class="week-grid__matrix"
        :style="{
          gridTemplateColumns: `${mealHeadWidth}px repeat(${days.length}, minmax(${dayColumnWidth}px, 1fr))`,
          gridTemplateRows,
        }"
      >
        <div class="week-grid__corner" aria-hidden="true"></div>
        <header
          v-for="day in days"
          :key="day.date"
          class="week-grid__day-head"
          :class="{
            'week-grid__day-head--today': day.isToday,
            'week-grid__day-head--weekend': day.isWeekend,
            'week-grid__day-head--holiday': day.holidayLabel,
          }"
          :data-date="day.date"
          :title="day.holidayLabel ? `${day.label} · ${day.holidayLabel}` : day.label"
        >
          <span>{{ day.shortLabel }}</span>
          <strong>{{ day.dayNumber }}</strong>
          <em v-if="day.holidayLabel">{{ day.holidayLabel }}</em>
        </header>

        <template v-for="slotCode in slotCodes" :key="slotCode">
          <aside
            class="week-grid__meal-head"
            :class="{ 'week-grid__meal-head--collapsed': isSlotCollapsed(slotCode) }"
          >
            <button
              type="button"
              :aria-expanded="!isSlotCollapsed(slotCode)"
              :aria-label="isSlotCollapsed(slotCode) ? `Afficher ${mealSlotLabel(slotCode)}` : `Masquer ${mealSlotLabel(slotCode)}`"
              @click="toggleSlotCollapse(slotCode)"
            >
              <span aria-hidden="true">{{ isSlotCollapsed(slotCode) ? '›' : '⌄' }}</span>
              <strong>{{ mealSlotLabel(slotCode) }}</strong>
            </button>
          </aside>
          <div
            v-for="day in days"
            :key="`${day.date}:${slotCode}`"
            class="week-grid__cell"
            :class="{
              'week-grid__cell--collapsed': isSlotCollapsed(slotCode),
              'week-grid__cell--today': day.isToday,
              'week-grid__cell--weekend': day.isWeekend,
              'week-grid__cell--holiday': day.holidayLabel,
            }"
          >
            <MealSlotCell
              :slot="mealSlotFor(day.date, slotCode)"
              :meal-label="mealSlotLabel(slotCode)"
              :show-meal-label="false"
              :collapsed="isSlotCollapsed(slotCode)"
              :readonly="readonly"
              @patch="emit('patch', $event)"
            />
          </div>
        </template>
      </div>
      <p v-if="!slotCodes.length" class="week-grid__empty">Aucun type de repas à afficher.</p>
    </div>

    <button
      type="button"
      class="week-grid__load week-grid__load--after"
      :disabled="loading"
      aria-label="Charger les jours suivants"
      title="Charger les jours suivants"
      @click="emit('extend-period', 'after')"
    >
      <span aria-hidden="true">→</span>
    </button>
  </section>
</template>

<style scoped>
.week-grid {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 24px;
  gap: 4px;
}

.week-grid__load {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
}

.week-grid__load:hover,
.week-grid__load:focus-visible {
  border-color: var(--color-border-hover);
  color: var(--color-primary);
  background: var(--color-surface-muted);
}

.week-grid__load:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.week-grid__load:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.week-grid__scroller {
  height: 100%;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-border);
}

.week-grid__matrix {
  display: grid;
  gap: 1px;
  height: 100%;
  min-width: 980px;
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
  display: grid;
  gap: 1px;
  align-content: center;
  justify-items: center;
  padding: 6px 8px;
  text-transform: capitalize;
}

.week-grid__day-head span {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
}

.week-grid__day-head strong {
  color: var(--color-text-primary);
  font-size: 0.92rem;
}

.week-grid__day-head em {
  overflow: hidden;
  max-width: 100%;
  color: var(--color-success);
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-grid__day-head--weekend,
.week-grid__cell--weekend {
  background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
}

.week-grid__day-head--holiday,
.week-grid__cell--holiday {
  background: color-mix(in srgb, var(--color-success) 6%, var(--color-surface));
}

.week-grid__day-head--today,
.week-grid__cell--today {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
}

.week-grid__day-head--today {
  box-shadow: inset 0 -2px 0 var(--color-primary);
}

.week-grid__meal-head {
  left: 0;
  z-index: 3;
  padding: 9px 10px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  font-weight: 700;
  text-transform: capitalize;
}

.week-grid__meal-head button {
  width: 100%;
  min-width: 0;
  height: 100%;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  text-transform: inherit;
  cursor: pointer;
}

.week-grid__meal-head button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.week-grid__meal-head span {
  width: 14px;
  color: var(--color-text-tertiary);
  font-size: 1rem;
  line-height: 1;
}

.week-grid__meal-head strong {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
}

.week-grid__meal-head--collapsed {
  background: var(--color-surface-muted);
}

.week-grid__cell {
  min-height: 0;
  padding: 6px;
  overflow: hidden;
}

.week-grid__cell--collapsed {
  padding: 0;
  background: var(--color-surface-muted);
}

.week-grid__empty {
  margin: 0;
  padding: 18px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

@media (max-width: 760px) {
  .week-grid {
    grid-template-columns: 22px minmax(0, 1fr) 22px;
    gap: 4px;
  }

  .week-grid__matrix {
    min-width: 820px;
  }

  .week-grid__cell {
    padding: 6px;
  }
}
</style>
