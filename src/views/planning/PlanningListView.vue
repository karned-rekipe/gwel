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

const formatDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const defaultStart = new Date(today)
defaultStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const defaultEnd = new Date(defaultStart)
defaultEnd.setDate(defaultStart.getDate() + 14)

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
  enabledMealSlotCodes.value.filter((code) => availableMealSlots.value.some((slot) => slot.code === code)),
)

const visibleDateRangeLabel = computed(() => `${filters.dateFrom} → ${filters.dateTo}`)

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
    <header class="planning-page__header">
      <div>
        <p class="planning-page__eyebrow">Planning</p>
        <h1>Planification des repas</h1>
        <p class="planning-page__subtitle">{{ visibleDateRangeLabel }}</p>
      </div>
      <div class="planning-page__header-actions">
        <RouterLink :to="{ name: 'planning-preferences' }" class="planning-page__link">Préférences</RouterLink>
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
            <p>Types de repas</p>
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
      </div>
    </header>

    <form class="planning-page__filters" @submit.prevent="loadCalendar">
      <label>
        Début
        <input v-model="filters.dateFrom" type="date" required />
      </label>
      <label>
        Fin
        <input v-model="filters.dateTo" type="date" required />
      </label>
      <button type="submit" :disabled="store.loading">Afficher</button>
    </form>

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
  padding: 24px clamp(14px, 2vw, 28px) 48px;
}

.planning-page__header,
.planning-page__filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.planning-page__header {
  justify-content: space-between;
  margin-bottom: 16px;
}

.planning-page__eyebrow {
  margin: 0 0 4px;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}

.planning-page h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700;
}

.planning-page__subtitle {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.92rem;
}

.planning-page__header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.planning-page__settings {
  position: relative;
}

.planning-page__filters {
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.planning-page__filters label {
  display: grid;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.planning-page__filters input,
.planning-page__filters button,
.planning-page__link,
.planning-page__settings-trigger {
  min-height: 38px;
  border-radius: var(--radius-md);
  font: inherit;
}

.planning-page__filters input {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  padding: 7px 10px;
}

.planning-page__filters button,
.planning-page__link,
.planning-page__settings-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--color-border);
  padding: 7px 12px;
}

.planning-page__filters button {
  align-self: end;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
}

.planning-page__settings-trigger {
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
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
  width: 100%;
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
  .planning-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  .planning-page__header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .planning-page__settings-panel {
    right: auto;
    left: 0;
  }
}
</style>
