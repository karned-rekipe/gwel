<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import MealPlanWeekGrid from '@/components/planning/MealPlanWeekGrid.vue'
import type { MealCalendarParams } from '@/services/mealPlannerService'
import { useMealPlanStore } from '@/stores/mealPlanStore'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type { SlotPatchOperation } from '@/types/mealPlan'

const store = useMealPlanStore()
const preferencesStore = useTenantPreferencesStore()
const actionError = ref<string | null>(null)

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
        <h1>Calendrier repas</h1>
      </div>
      <RouterLink :to="{ name: 'planning-preferences' }" class="planning-page__link">Préférences</RouterLink>
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
        @patch="applyPatch"
      />
    </section>
  </main>
</template>

<style scoped>
.planning-page {
  width: 100%;
  padding: 28px clamp(16px, 2vw, 32px) 56px;
}

.planning-page__header,
.planning-page__filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.planning-page__header {
  justify-content: space-between;
  margin-bottom: 18px;
}

.planning-page__eyebrow {
  margin: 0 0 4px;
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
}

.planning-page h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 2rem;
  font-weight: 700;
}

.planning-page__filters {
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.planning-page__filters label {
  display: grid;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.planning-page__filters input,
.planning-page__filters button,
.planning-page__link {
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
.planning-page__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  padding: 7px 12px;
}

.planning-page__filters button {
  align-self: end;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
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
}
</style>
