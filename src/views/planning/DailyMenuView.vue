<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MealSlotCell from '@/components/planning/MealSlotCell.vue'
import PlanningMembersRequired from '@/components/planning/PlanningMembersRequired.vue'
import { hasDailyMealContent } from '@/components/planning/dailyMealVisibility'
import { resolveMealSlotDefinitions } from '@/components/planning/mealSlotDefinitions'
import RecipeLayer from '@/components/organisms/RecipeLayer.vue'
import ResourceLayerDock from '@/components/resources/ResourceLayerDock.vue'
import type { MealCalendarParams } from '@/services/mealPlannerService'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import { useIngredientCatalogStore } from '@/stores/ingredientCatalogStore'
import { useMealPlanStore } from '@/stores/mealPlanStore'
import { useRecipeCatalogStore } from '@/stores/recipeCatalogStore'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type { MealSlot, SlotPatchOperation } from '@/types/mealPlan'
import { addDaysToIsoDate, isIsoDate, isoDateFromDate } from '@/utils/localDate'
import {
  closeResourceLayer,
  createResourceLayersState,
  minimizeResourceLayer,
  openResourceLayer,
  renameResourceLayer,
  restoreResourceLayer,
  type ResourceLayersState,
} from '@/utils/resourceLayers'

const route = useRoute()
const router = useRouter()
const store = useMealPlanStore()
const membersStore = useHouseholdMembersStore()
const ingredientCatalog = useIngredientCatalogStore()
const recipeCatalog = useRecipeCatalogStore()
const preferencesStore = useTenantPreferencesStore()
const actionError = ref<string | null>(null)
const membersLoaded = ref(false)
const ready = ref(false)
const layers = ref<ResourceLayersState>(createResourceLayersState())
const today = isoDateFromDate(new Date())

const dayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const selectedDate = computed(() => {
  const value = Array.isArray(route.query.date) ? route.query.date[0] : route.query.date
  return isIsoDate(value) ? value : today
})

const selectedDayLabel = computed(() => (
  dayFormatter.format(new Date(`${selectedDate.value}T12:00:00`))
))

const isToday = computed(() => selectedDate.value === today)
const previousDate = computed(() => addDaysToIsoDate(selectedDate.value, -1))
const nextDate = computed(() => addDaysToIsoDate(selectedDate.value, 1))
const calendarParams = computed<MealCalendarParams>(() => ({
  date_from: selectedDate.value,
  date_to: selectedDate.value,
}))

const mealLabels = computed<Record<string, string>>(() => Object.fromEntries(
  (preferencesStore.current?.meal_slots ?? []).map((slot) => [slot.code, slot.label]),
))

const availableMealSlots = computed(() => resolveMealSlotDefinitions(
  preferencesStore.current?.meal_slots ?? [],
  store.current?.slots ?? [],
  mealLabels.value,
))

const availableSlotRows = computed(() => availableMealSlots.value.map((slot) => ({
  slot_code: slot.code,
  label: slot.label,
})))

const slotByCode = computed(() => new Map(
  (store.current?.slots ?? [])
    .filter((slot) => slot.date === selectedDate.value)
    .map((slot) => [slot.slot_code, slot] as const),
))

const visibleMealSlots = computed(() => availableMealSlots.value.filter((meal) => {
  return hasDailyMealContent(slotByCode.value.get(meal.code))
}))

const mealSlotFor = (slotCode: string): MealSlot => slotByCode.value.get(slotCode) ?? {
  date: selectedDate.value,
  slot_code: slotCode,
  headcount: null,
  headcount_source: null,
  member_ids: [],
  items: [],
}

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

const openRecipe = (recipe: { uuid: string; name: string }): void => {
  layers.value = openResourceLayer(layers.value, {
    kind: 'recipe',
    uuid: recipe.uuid,
    name: recipe.name,
  })
}

const restoreLayer = (key: string): void => {
  layers.value = restoreResourceLayer(layers.value, key)
}

const minimizeLayer = (key: string): void => {
  layers.value = minimizeResourceLayer(layers.value, key)
}

const closeLayer = (key: string): void => {
  layers.value = closeResourceLayer(layers.value, key)
}

const renameLayer = (key: string, title: string): void => {
  layers.value = renameResourceLayer(layers.value, key, title)
}

const showDate = (date: string): void => {
  void router.push({
    name: 'planning-today',
    query: date === today ? {} : { date },
  })
}

watch(selectedDate, () => {
  if (ready.value && membersStore.members.length && !membersStore.error) {
    void loadCalendar()
  }
})

onMounted(async () => {
  await membersStore.fetchMembers()
  membersLoaded.value = true
  if (!membersStore.members.length || membersStore.error) {
    ready.value = true
    return
  }

  await Promise.all([loadCalendar(), preferencesStore.fetchPreferences()])
  ingredientCatalog.warmup()
  recipeCatalog.warmup()
  ready.value = true
})
</script>

<template>
  <main class="daily-menu-page">
    <p v-if="store.error" class="daily-menu-page__error">{{ store.error }}</p>
    <p v-if="actionError" class="daily-menu-page__error">{{ actionError }}</p>
    <p v-if="membersStore.error" class="daily-menu-page__error">{{ membersStore.error }}</p>
    <p v-if="store.loading || !membersLoaded" class="daily-menu-page__muted">Chargement…</p>

    <PlanningMembersRequired
      v-if="membersLoaded && !membersStore.error && !membersStore.members.length"
    />

    <section v-else-if="store.current" class="daily-menu-page__content">
      <header class="daily-menu-page__navigation">
        <button
          type="button"
          :aria-label="`Afficher le menu du ${previousDate}`"
          title="Jour précédent"
          :disabled="store.loading"
          @click="showDate(previousDate)"
        >
          <span aria-hidden="true">←</span>
          J−1
        </button>

        <div>
          <span v-if="isToday">Aujourd’hui</span>
          <h1>{{ selectedDayLabel }}</h1>
        </div>

        <button
          type="button"
          :aria-label="`Afficher le menu du ${nextDate}`"
          title="Jour suivant"
          :disabled="store.loading"
          @click="showDate(nextDate)"
        >
          J+1
          <span aria-hidden="true">→</span>
        </button>
      </header>

      <div v-if="visibleMealSlots.length" class="daily-menu-page__meals">
        <article
          v-for="meal in visibleMealSlots"
          :key="meal.code"
          class="daily-menu-page__meal"
        >
          <h2>{{ meal.label }}</h2>
          <div class="daily-menu-page__slot">
            <MealSlotCell
              :slot="mealSlotFor(meal.code)"
              :meal-label="meal.label"
              :show-meal-label="false"
              expanded
              :household-members="membersStore.members"
              :uses-named-members="true"
              :available-slot-rows="availableSlotRows"
              open-recipe-details
              @patch="applyPatch"
              @open-recipe="openRecipe"
            />
          </div>
        </article>
      </div>
      <p v-else class="daily-menu-page__empty">Aucun repas prévu pour cette journée.</p>
    </section>

    <RecipeLayer
      v-for="session in layers.sessions"
      :key="session.key"
      :uuid="session.uuid"
      :fallback-title="session.title"
      :expanded="layers.activeKey === session.key"
      @minimize="minimizeLayer(session.key)"
      @close="closeLayer(session.key)"
      @title-change="renameLayer(session.key, $event)"
    />
    <ResourceLayerDock
      :sessions="layers.sessions"
      :active-key="layers.activeKey"
      @restore="restoreLayer"
      @close="closeLayer"
      @minimize="minimizeLayer"
    />
  </main>
</template>

<style scoped>
.daily-menu-page {
  height: calc(100vh - 61px);
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
}

.daily-menu-page__content {
  width: min(1240px, 100%);
  margin: 0 auto;
}

.daily-menu-page__navigation {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.daily-menu-page__navigation > div {
  min-width: 0;
  text-align: center;
}

.daily-menu-page__navigation h1 {
  margin: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: clamp(1rem, 2vw, 1.32rem);
  font-weight: 750;
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
}

.daily-menu-page__navigation > div > span {
  display: block;
  margin-bottom: 1px;
  color: var(--color-primary);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.daily-menu-page__navigation button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 750;
  cursor: pointer;
}

.daily-menu-page__navigation button:hover,
.daily-menu-page__navigation button:focus-visible {
  border-color: var(--color-border-hover);
  color: var(--color-primary);
  background: var(--color-surface-muted);
}

.daily-menu-page__navigation button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.daily-menu-page__navigation button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.daily-menu-page__meals {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.daily-menu-page__meal {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.daily-menu-page__meal h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.96rem;
  font-weight: 750;
}

.daily-menu-page__slot {
  min-height: 0;
}

.daily-menu-page__error,
.daily-menu-page__muted,
.daily-menu-page__empty {
  width: min(1240px, 100%);
  margin: 0 auto 12px;
}

.daily-menu-page__error {
  color: var(--color-danger);
}

.daily-menu-page__muted,
.daily-menu-page__empty {
  color: var(--color-text-secondary);
}

@media (max-width: 620px) {
  .daily-menu-page {
    padding: 10px;
  }

  .daily-menu-page__navigation {
    gap: 8px;
  }

  .daily-menu-page__navigation button {
    padding-inline: 9px;
  }

}
</style>
