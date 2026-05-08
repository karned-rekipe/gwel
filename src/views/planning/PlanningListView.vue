<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import MealPlanWeekGrid from '@/components/planning/MealPlanWeekGrid.vue'
import type { MealCalendarParams } from '@/services/mealPlannerService'
import { useMealPlanStore } from '@/stores/mealPlanStore'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type { SlotPatchOperation } from '@/types/mealPlan'
import type { MealSlotDefinition } from '@/types/tenantPreferences'

const store = useMealPlanStore()
const preferencesStore = useTenantPreferencesStore()
const actionError = ref<string | null>(null)
const isSettingsOpen = ref(false)
const enabledMealSlotCodes = ref<string[]>([])
const mealSlotFilterInitialized = ref(false)

const addDays = (value: Date, daysToAdd: number): Date => {
  const result = new Date(value)
  result.setDate(result.getDate() + daysToAdd)
  return result
}

const formatDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const periodFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const today = new Date()
const defaultStart = addDays(today, -7)
const defaultEnd = addDays(today, 21)

const filters = reactive({
  dateFrom: formatDate(defaultStart),
  dateTo: formatDate(defaultEnd),
})

const calendarParams = computed<MealCalendarParams>(() => ({
  date_from: filters.dateFrom,
  date_to: filters.dateTo,
}))

const mealLabels = computed<Record<string, string>>(() => Object.fromEntries(
  (preferencesStore.current?.meal_slots ?? []).map((slot) => [slot.code, slot.label]),
))

const fallbackMealSlots = computed<MealSlotDefinition[]>(() => {
  const seen = new Set<string>()
  return (store.current?.slots ?? []).flatMap((slot) => {
    if (seen.has(slot.slot_code)) return []
    seen.add(slot.slot_code)
    return [{
      code: slot.slot_code,
      label: mealLabels.value[slot.slot_code] ?? slot.slot_code,
      position: seen.size - 1,
    }]
  })
})

const availableMealSlots = computed<MealSlotDefinition[]>(() => {
  const configured = preferencesStore.current?.meal_slots ?? []
  const source = configured.length ? configured : fallbackMealSlots.value
  return [...source].sort((left, right) => left.position - right.position)
})

const activeMealSlotCodes = computed(() =>
  availableMealSlots.value
    .map((slot) => slot.code)
    .filter((code) => enabledMealSlotCodes.value.includes(code)),
)

const visibleDateRangeLabel = computed(() => {
  const start = new Date(`${filters.dateFrom}T12:00:00`)
  const end = new Date(`${filters.dateTo}T12:00:00`)
  return `${periodFormatter.format(start)} - ${periodFormatter.format(end)}`
})

const loadCalendar = async (): Promise<void> => {
  actionError.value = null
  await store.fetchCalendar(calendarParams.value)
}

const applyPatch = async (operations: SlotPatchOperation[]): Promise<void> => {
  actionError.value = null
  try {
    await store.applyCalendarPatch(operations, calendarParams.value)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Modification impossible.'
  }
}

const toggleMealSlot = (code: string): void => {
  if (enabledMealSlotCodes.value.includes(code)) {
    if (enabledMealSlotCodes.value.length === 1) return
    enabledMealSlotCodes.value = enabledMealSlotCodes.value.filter((item) => item !== code)
  } else {
    enabledMealSlotCodes.value = [...enabledMealSlotCodes.value, code]
  }
}

const extendPeriod = async (side: 'before' | 'after'): Promise<void> => {
  if (side === 'before') {
    filters.dateFrom = formatDate(addDays(new Date(`${filters.dateFrom}T12:00:00`), -7))
  } else {
    filters.dateTo = formatDate(addDays(new Date(`${filters.dateTo}T12:00:00`), 7))
  }
  await loadCalendar()
}

watch(availableMealSlots, (slots) => {
  const codes = slots.map((slot) => slot.code)
  if (!codes.length) return

  if (!mealSlotFilterInitialized.value) {
    enabledMealSlotCodes.value = codes
    mealSlotFilterInitialized.value = true
    return
  }

  const knownCodes = enabledMealSlotCodes.value.filter((code) => codes.includes(code))
  enabledMealSlotCodes.value = knownCodes.length ? knownCodes : codes
}, { immediate: true })

onMounted(() => {
  void loadCalendar()
  void preferencesStore.fetchPreferences()
})
</script>

<template>
  <main class="planning-page">
    <section class="planning-page__toolbar" aria-label="Contrôles du planning">
      <button type="button" class="planning-page__ghost-button" :disabled="store.loading" @click="extendPeriod('before')">
        ← Charger avant
      </button>
      <div class="planning-page__period">
        <strong>Planification des repas</strong>
        <span>{{ visibleDateRangeLabel }}</span>
      </div>
      <button type="button" class="planning-page__ghost-button" :disabled="store.loading" @click="extendPeriod('after')">
        Charger après →
      </button>
      <div class="planning-page__settings">
        <button
          type="button"
          class="planning-page__settings-trigger"
          :aria-expanded="isSettingsOpen"
          aria-controls="planning-meal-settings"
          @click="isSettingsOpen = !isSettingsOpen"
        >
          <span aria-hidden="true">⚙</span>
          <span>Paramètres</span>
        </button>
        <div
          v-if="isSettingsOpen"
          id="planning-meal-settings"
          class="planning-page__settings-panel"
        >
          <p>Types de repas à afficher</p>
          <label
            v-for="slot in availableMealSlots"
            :key="slot.code"
            class="planning-page__check"
          >
            <input
              type="checkbox"
              :checked="activeMealSlotCodes.includes(slot.code)"
              :disabled="activeMealSlotCodes.length === 1 && activeMealSlotCodes.includes(slot.code)"
              @change="toggleMealSlot(slot.code)"
            />
            <span aria-hidden="true">✓</span>
            <strong>{{ slot.label }}</strong>
          </label>
        </div>
      </div>
    </section>

    <p v-if="store.error" class="planning-page__error">{{ store.error }}</p>
    <p v-if="actionError" class="planning-page__error">{{ actionError }}</p>
    <p v-if="store.loading" class="planning-page__muted">Chargement…</p>

    <section v-if="store.current" class="planning-page__layout">
      <MealPlanWeekGrid
        :plan="store.current"
        :meal-labels="mealLabels"
        :visible-slot-codes="activeMealSlotCodes"
        @patch="applyPatch"
      />
    </section>
  </main>
</template>

<style scoped>
.planning-page {
  width: 100%;
  height: calc(100vh - 61px);
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 10px 12px 12px;
}

.planning-page__toolbar {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.planning-page__period {
  display: grid;
  gap: 2px;
  justify-items: center;
  min-width: 0;
}

.planning-page__period strong {
  overflow: hidden;
  max-width: 100%;
  color: var(--color-text-primary);
  font-size: 0.98rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planning-page__period span {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.planning-page__settings {
  position: relative;
}

.planning-page__ghost-button,
.planning-page__settings-trigger {
  min-height: 34px;
  border-radius: var(--radius-md);
  font: inherit;
}

.planning-page__ghost-button,
.planning-page__settings-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--color-border);
  padding: 7px 12px;
}

.planning-page__ghost-button,
.planning-page__settings-trigger {
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
}

.planning-page__ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.planning-page__settings-panel {
  position: absolute;
  z-index: 30;
  top: calc(100% + 8px);
  right: 0;
  width: min(260px, calc(100vw - 32px));
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.14);
}

.planning-page__settings-panel p {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 650;
}

.planning-page__check {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  color: var(--color-text-primary);
  cursor: pointer;
}

.planning-page__check input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.planning-page__check span {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: transparent;
  background: var(--color-surface);
  font-size: 0.78rem;
  font-weight: 800;
}

.planning-page__check input:checked + span {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.planning-page__check input:focus-visible + span {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.planning-page__check strong {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planning-page__layout {
  min-height: 0;
  flex: 1;
}

.planning-page__error {
  margin: 0 0 14px;
  color: var(--color-danger);
}

.planning-page__muted {
  margin: 0 0 14px;
  color: var(--color-text-secondary);
}

@media (max-width: 960px) {
  .planning-page {
    height: calc(100vh - 61px);
  }

  .planning-page__toolbar {
    grid-template-columns: 1fr 1fr;
  }

  .planning-page__period {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .planning-page__settings {
    justify-self: end;
  }
}
</style>
