<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import MemberSelector from '@/components/planning/MemberSelector.vue'
import PlanningMembersRequired from '@/components/planning/PlanningMembersRequired.vue'
import PlanningSettingsShell from '@/components/planning/PlanningSettingsShell.vue'
import { initialsFor, membersForIds, textColorFor } from '@/components/planning/memberDisplay'
import { householdScheduleService } from '@/services/householdScheduleService'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type {
  DayOfWeek,
  HouseholdSchedule,
  HouseholdScheduleRulePayload,
  SchoolPeriodType,
  WeekParity,
} from '@/types/householdSchedule'
import type { MealSlotDefinition } from '@/types/tenantPreferences'

interface ScheduleTemplate {
  id: string
  label: string
  weekParity: WeekParity
  schoolPeriodType: SchoolPeriodType
}

interface ActiveCell {
  template: ScheduleTemplate
  day: { code: DayOfWeek; label: string }
  mealSlot: MealSlotDefinition
}

const membersStore = useHouseholdMembersStore()
const preferencesStore = useTenantPreferencesStore()
const schedule = ref<HouseholdSchedule | null>(null)
const scheduleEtag = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const activeCell = ref<ActiveCell | null>(null)
const selection = ref<string[]>([])
const ruleMemberIds = reactive<Record<string, string[]>>({})

const defaultMealSlots: MealSlotDefinition[] = [
  { code: 'lunch', label: 'Déjeuner', position: 0 },
  { code: 'dinner', label: 'Dîner', position: 1 },
]

const templates: ScheduleTemplate[] = [
  { id: 'even-regular', label: 'Semaine paire · hors vacances', weekParity: 'even', schoolPeriodType: 'regular' },
  { id: 'odd-regular', label: 'Semaine impaire · hors vacances', weekParity: 'odd', schoolPeriodType: 'regular' },
  { id: 'even-vacation', label: 'Semaine paire · vacances', weekParity: 'even', schoolPeriodType: 'vacation' },
  { id: 'odd-vacation', label: 'Semaine impaire · vacances', weekParity: 'odd', schoolPeriodType: 'vacation' },
]

const days: Array<{ code: DayOfWeek; label: string }> = [
  { code: 'monday', label: 'Lun.' },
  { code: 'tuesday', label: 'Mar.' },
  { code: 'wednesday', label: 'Mer.' },
  { code: 'thursday', label: 'Jeu.' },
  { code: 'friday', label: 'Ven.' },
  { code: 'saturday', label: 'Sam.' },
  { code: 'sunday', label: 'Dim.' },
]

const mealSlots = computed(() => {
  const configured = preferencesStore.current?.meal_slots ?? []
  return [...(configured.length ? configured : defaultMealSlots)].sort((a, b) => a.position - b.position)
})

const knownMemberIds = computed(() => new Set(membersStore.members.map((member) => member.uuid)))

const ruleKey = (
  template: Pick<ScheduleTemplate, 'weekParity' | 'schoolPeriodType'>,
  dayCode: DayOfWeek,
  mealSlotCode: string,
): string => `${template.weekParity}:${template.schoolPeriodType}:${dayCode}:${mealSlotCode}`

const selectedMembersFor = (template: ScheduleTemplate, dayCode: DayOfWeek, mealSlotCode: string) =>
  membersForIds(ruleMemberIds[ruleKey(template, dayCode, mealSlotCode)] ?? [], membersStore.members)

const openCell = (template: ScheduleTemplate, day: ActiveCell['day'], mealSlot: MealSlotDefinition): void => {
  activeCell.value = { template, day, mealSlot }
  selection.value = [...(ruleMemberIds[ruleKey(template, day.code, mealSlot.code)] ?? [])]
}

const closeCell = (): void => {
  activeCell.value = null
  selection.value = []
}

const sanitizedSelection = (): string[] =>
  selection.value.filter((uuid, index, values) => knownMemberIds.value.has(uuid) && values.indexOf(uuid) === index)

const applyCell = (): void => {
  if (!activeCell.value) return
  ruleMemberIds[ruleKey(activeCell.value.template, activeCell.value.day.code, activeCell.value.mealSlot.code)] = sanitizedSelection()
  closeCell()
}

const applyTemplate = (): void => {
  if (!activeCell.value) return
  const selectedIds = sanitizedSelection()
  for (const day of days) {
    for (const mealSlot of mealSlots.value) {
      ruleMemberIds[ruleKey(activeCell.value.template, day.code, mealSlot.code)] = [...selectedIds]
    }
  }
  closeCell()
}

const applySchedule = (payload: HouseholdSchedule): void => {
  for (const key of Object.keys(ruleMemberIds)) delete ruleMemberIds[key]
  for (const rule of payload.rules) {
    const key = `${rule.week_parity}:${rule.school_period_type}:${rule.day_of_week}:${rule.meal_slot_code}`
    ruleMemberIds[key] = rule.member_ids.filter((uuid) => knownMemberIds.value.has(uuid))
  }
}

const buildRules = (): HouseholdScheduleRulePayload[] => templates.flatMap((template) =>
  days.flatMap((day) => mealSlots.value.flatMap((mealSlot) => {
    const memberIds = (ruleMemberIds[ruleKey(template, day.code, mealSlot.code)] ?? [])
      .filter((uuid) => knownMemberIds.value.has(uuid))
    if (!memberIds.length) return []
    return [{
      week_parity: template.weekParity,
      school_period_type: template.schoolPeriodType,
      day_of_week: day.code,
      meal_slot_code: mealSlot.code,
      member_ids: memberIds,
    }]
  })),
)

const save = async (): Promise<void> => {
  if (!schedule.value || !scheduleEtag.value) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    const response = await householdScheduleService.update(scheduleEtag.value, {
      school_zone: schedule.value.school_zone ?? null,
      schedule_mode: 'members',
      rules: buildRules(),
    })
    schedule.value = response.payload
    scheduleEtag.value = response.etag
    applySchedule(response.payload)
    success.value = 'Présences enregistrées.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Enregistrement des présences impossible.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([membersStore.fetchMembers(), preferencesStore.fetchPreferences()])
    const response = await householdScheduleService.get()
    schedule.value = response.payload
    scheduleEtag.value = response.etag
    applySchedule(response.payload)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chargement des présences impossible.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PlanningSettingsShell title="Présences aux repas">
    <p v-if="loading" class="attendance-page__muted">Chargement…</p>
    <p v-if="error || membersStore.error || preferencesStore.error" class="attendance-page__error">
      {{ error || membersStore.error || preferencesStore.error }}
    </p>
    <p v-if="success" class="attendance-page__success">{{ success }}</p>

    <PlanningMembersRequired v-if="!loading && !membersStore.members.length" />

    <template v-else-if="!loading">
      <section class="attendance-page__templates">
        <article v-for="template in templates" :key="template.id" class="attendance-page__template">
          <h2>{{ template.label }}</h2>
          <div class="attendance-page__table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Repas</th>
                  <th v-for="day in days" :key="day.code" scope="col">{{ day.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mealSlot in mealSlots" :key="mealSlot.code">
                  <th scope="row">{{ mealSlot.label }}</th>
                  <td v-for="day in days" :key="day.code">
                    <button
                      type="button"
                      class="attendance-cell"
                      :aria-label="`Configurer ${template.label}, ${day.label}, ${mealSlot.label}`"
                      @click="openCell(template, day, mealSlot)"
                    >
                      <span
                        v-for="member in selectedMembersFor(template, day.code, mealSlot.code).slice(0, 3)"
                        :key="member.uuid"
                        class="attendance-cell__avatar"
                        :style="{ backgroundColor: member.color, color: textColorFor(member.color) }"
                        :title="member.name"
                      >
                        <img v-if="member.avatar_data" :src="member.avatar_data" :alt="member.name" />
                        <span v-else>{{ initialsFor(member.name) }}</span>
                      </span>
                      <strong v-if="selectedMembersFor(template, day.code, mealSlot.code).length > 3">
                        +{{ selectedMembersFor(template, day.code, mealSlot.code).length - 3 }}
                      </strong>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <div class="attendance-page__actions">
        <AppButton type="button" :disabled="saving" @click="save">
          {{ saving ? 'Enregistrement…' : 'Enregistrer les présences' }}
        </AppButton>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="activeCell" class="attendance-modal" @click.self="closeCell" @keydown.esc="closeCell">
        <section class="attendance-modal__panel" role="dialog" aria-modal="true" aria-labelledby="attendance-modal-title">
          <header>
            <div>
              <p>{{ activeCell.template.label }}</p>
              <h2 id="attendance-modal-title">{{ activeCell.day.label }} · {{ activeCell.mealSlot.label }}</h2>
            </div>
            <button type="button" aria-label="Fermer" @click="closeCell">×</button>
          </header>

          <MemberSelector v-model="selection" :members="membersStore.members" />

          <footer>
            <AppButton type="button" variant="secondary" @click="closeCell">Annuler</AppButton>
            <AppButton type="button" variant="secondary" @click="applyTemplate">Appliquer à cette semaine</AppButton>
            <AppButton type="button" @click="applyCell">Appliquer à ce repas</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>
  </PlanningSettingsShell>
</template>

<style scoped>
.attendance-page__templates {
  display: grid;
  gap: 24px;
}

.attendance-page__template {
  display: grid;
  gap: 10px;
}

.attendance-page__template h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.05rem;
}

.attendance-page__table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.attendance-page__table-wrap table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  table-layout: fixed;
}

.attendance-page__table-wrap th,
.attendance-page__table-wrap td {
  border: 1px solid var(--color-border);
  padding: 5px;
  text-align: center;
}

.attendance-page__table-wrap th {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 0.76rem;
}

.attendance-page__table-wrap thead th:first-child,
.attendance-page__table-wrap tbody th {
  width: 110px;
  text-align: left;
}

.attendance-cell {
  width: 100%;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 7px 4px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}

.attendance-cell:hover,
.attendance-cell:focus-visible {
  background: var(--color-surface-muted);
}

.attendance-cell__avatar,
.attendance-cell strong {
  width: 25px;
  height: 25px;
  overflow: hidden;
  display: grid;
  place-items: center;
  margin-left: -7px;
  border: 2px solid var(--color-surface);
  border-radius: var(--radius-full);
  font-size: 0.62rem;
  font-weight: 800;
}

.attendance-cell__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attendance-cell strong {
  width: auto;
  min-width: 28px;
  padding: 0 5px;
  background: var(--color-primary);
  color: #ffffff;
}

.attendance-page__actions {
  margin-top: 24px;
}

.attendance-page__muted,
.attendance-page__error,
.attendance-page__success {
  margin: 0 0 14px;
}

.attendance-page__muted {
  color: var(--color-text-secondary);
}

.attendance-page__error {
  color: var(--color-danger);
}

.attendance-page__success {
  color: var(--color-success);
}

.attendance-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.44);
}

.attendance-modal__panel {
  width: min(640px, 100%);
  display: grid;
  gap: 22px;
  padding: 22px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.attendance-modal header,
.attendance-modal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.attendance-modal header p,
.attendance-modal header h2 {
  margin: 0;
}

.attendance-modal header p {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.attendance-modal header h2 {
  color: var(--color-text-primary);
  font-size: 1.2rem;
}

.attendance-modal header > button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 1.2rem;
  cursor: pointer;
}

@media (max-width: 680px) {
  .attendance-modal footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
