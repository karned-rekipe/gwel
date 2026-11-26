<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import MealPlanWeekGrid from '@/components/planning/MealPlanWeekGrid.vue'
import PlanningMembersRequired from '@/components/planning/PlanningMembersRequired.vue'
import { resolveMealSlotDefinitions } from '@/components/planning/mealSlotDefinitions'
import type { MealCalendarParams } from '@/services/mealPlannerService'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import { useIngredientCatalogStore } from '@/stores/ingredientCatalogStore'
import { useMealPlanStore } from '@/stores/mealPlanStore'
import { useRecipeCatalogStore } from '@/stores/recipeCatalogStore'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type { SlotPatchOperation } from '@/types/mealPlan'

const store = useMealPlanStore()
const membersStore = useHouseholdMembersStore()
const ingredientCatalog = useIngredientCatalogStore()
const recipeCatalog = useRecipeCatalogStore()
const preferencesStore = useTenantPreferencesStore()
const actionError = ref<string | null>(null)
const membersLoaded = ref(false)
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

const availableMealSlots = computed(() => resolveMealSlotDefinitions(
  preferencesStore.current?.meal_slots ?? [],
  store.current?.slots ?? [],
  mealLabels.value,
))

const activeMealSlotCodes = computed(() =>
  availableMealSlots.value
    .map((slot) => slot.code),
)

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

const extendPeriod = async (side: 'before' | 'after'): Promise<void> => {
  if (side === 'before') {
    filters.dateFrom = formatDate(addDays(new Date(`${filters.dateFrom}T12:00:00`), -7))
  } else {
    filters.dateTo = formatDate(addDays(new Date(`${filters.dateTo}T12:00:00`), 7))
  }
  await loadCalendar()
}

onMounted(async () => {
  await membersStore.fetchMembers()
  membersLoaded.value = true
  if (!membersStore.members.length || membersStore.error) return
  await Promise.all([loadCalendar(), preferencesStore.fetchPreferences()])
  ingredientCatalog.warmup()
  recipeCatalog.warmup()
})
</script>

<template>
  <main class="planning-page">
    <p v-if="store.error" class="planning-page__error">{{ store.error }}</p>
    <p v-if="actionError" class="planning-page__error">{{ actionError }}</p>
    <p v-if="membersStore.error" class="planning-page__error">{{ membersStore.error }}</p>
    <p v-if="store.loading || !membersLoaded" class="planning-page__muted">Chargement…</p>

    <PlanningMembersRequired
      v-if="membersLoaded && !membersStore.error && !membersStore.members.length"
    />

    <section v-else-if="store.current" class="planning-page__layout">
      <MealPlanWeekGrid
        :plan="store.current"
        :meal-labels="mealLabels"
        :visible-slot-codes="activeMealSlotCodes"
        :household-members="membersStore.members"
        :uses-named-members="true"
        :loading="store.loading"
        @patch="applyPatch"
        @extend-period="extendPeriod"
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
  padding: 8px 10px 10px;
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
}
</style>
