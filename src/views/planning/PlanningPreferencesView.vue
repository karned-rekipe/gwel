<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import { householdScheduleService } from '@/services/householdScheduleService'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type {
  DayOfWeek,
  HouseholdSchedule,
  HouseholdScheduleRulePayload,
  SchoolPeriodType,
  SchoolVacationPeriod,
  SchoolVacationPeriodPayload,
  SchoolZone,
  VacationPeriodSource,
  WeekParity,
} from '@/types/householdSchedule'
import type { MealSlotDefinition } from '@/types/tenantPreferences'

interface ScheduleTemplate {
  id: string
  label: string
  weekParity: WeekParity
  schoolPeriodType: SchoolPeriodType
}

const store = useTenantPreferencesStore()
const defaultMealSlots: MealSlotDefinition[] = [
  { code: 'lunch', label: 'Déjeuner', position: 0 },
  { code: 'dinner', label: 'Dîner', position: 1 },
]

const scheduleTemplates: ScheduleTemplate[] = [
  { id: 'even-regular', label: 'Paire hors vacances', weekParity: 'even', schoolPeriodType: 'regular' },
  { id: 'odd-regular', label: 'Impaire hors vacances', weekParity: 'odd', schoolPeriodType: 'regular' },
  { id: 'even-vacation', label: 'Paire vacances', weekParity: 'even', schoolPeriodType: 'vacation' },
  { id: 'odd-vacation', label: 'Impaire vacances', weekParity: 'odd', schoolPeriodType: 'vacation' },
]

const days: Array<{ code: DayOfWeek; label: string }> = [
  { code: 'monday', label: 'Lundi' },
  { code: 'tuesday', label: 'Mardi' },
  { code: 'wednesday', label: 'Mercredi' },
  { code: 'thursday', label: 'Jeudi' },
  { code: 'friday', label: 'Vendredi' },
  { code: 'saturday', label: 'Samedi' },
  { code: 'sunday', label: 'Dimanche' },
]

const form = reactive({
  mealSlots: 'Déjeuner\nDîner',
  excludedIngredients: '',
  excludedGroups: '',
  favoriteRecipes: '',
})

const schedule = ref<HouseholdSchedule | null>(null)
const scheduleEtag = ref<string | null>(null)
const schoolZone = ref<SchoolZone | ''>('')
const ruleHeadcounts = reactive<Record<string, string>>({})
const vacationPeriods = ref<SchoolVacationPeriod[]>([])
const vacationEtags = reactive<Record<string, string>>({})
const scheduleLoading = ref(false)
const scheduleSaving = ref(false)
const vacationSaving = ref(false)
const scheduleError = ref<string | null>(null)
const vacationError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const vacationForm = reactive<{
  source: VacationPeriodSource
  schoolZone: SchoolZone | ''
  name: string
  startDate: string
  endDate: string
}>({
  source: 'manual',
  schoolZone: '',
  name: '',
  startDate: '',
  endDate: '',
})

const joinValues = (values: string[]): string => values.join('\n')
const splitValues = (value: string): string[] => value
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean)

const normalizeMealSlotCode = (label: string): string => {
  const ascii = label
    .trim()
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (['dejeuner', 'midi', 'lunch'].includes(ascii)) return 'lunch'
  if (['diner', 'soir', 'dinner'].includes(ascii)) return 'dinner'
  if (['petit dejeuner', 'petit-dejeuner', 'breakfast'].includes(ascii)) return 'breakfast'

  return ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const splitMealSlots = (value: string): MealSlotDefinition[] => {
  const labels = splitValues(value)
  const source = labels.length ? labels : defaultMealSlots.map((slot) => slot.label)
  const seen = new Set<string>()
  return source.flatMap((label, index) => {
    const code = normalizeMealSlotCode(label) || `repas-${index + 1}`
    if (seen.has(code)) return []
    seen.add(code)
    return [{ code, label, position: index }]
  })
}

const activeMealSlots = computed(() => splitMealSlots(form.mealSlots))

const ruleKey = (
  template: Pick<ScheduleTemplate, 'weekParity' | 'schoolPeriodType'>,
  dayCode: DayOfWeek,
  mealSlotCode: string,
): string => `${template.weekParity}:${template.schoolPeriodType}:${dayCode}:${mealSlotCode}`

const setRuleValue = (key: string, event: Event): void => {
  ruleHeadcounts[key] = (event.target as HTMLInputElement).value
}

const applyScheduleToForm = (payload: HouseholdSchedule): void => {
  schoolZone.value = payload.school_zone ?? ''
  for (const key of Object.keys(ruleHeadcounts)) {
    delete ruleHeadcounts[key]
  }
  for (const rule of payload.rules) {
    ruleHeadcounts[ruleKey({
      weekParity: rule.week_parity,
      schoolPeriodType: rule.school_period_type,
    }, rule.day_of_week, rule.meal_slot_code)] = String(rule.headcount)
  }
}

const parseRuleHeadcount = (rawValue: string, label: string): number | null => {
  const value = rawValue.trim()
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 20) {
    throw new Error(`${label} doit être un entier entre 0 et 20.`)
  }
  return parsed
}

const buildScheduleRules = (): HouseholdScheduleRulePayload[] => {
  const rules: HouseholdScheduleRulePayload[] = []
  for (const template of scheduleTemplates) {
    for (const day of days) {
      for (const mealSlot of activeMealSlots.value) {
        const key = ruleKey(template, day.code, mealSlot.code)
        const headcount = parseRuleHeadcount(ruleHeadcounts[key] ?? '', `${template.label} / ${day.label} / ${mealSlot.label}`)
        if (headcount === null) continue
        rules.push({
          week_parity: template.weekParity,
          school_period_type: template.schoolPeriodType,
          day_of_week: day.code,
          meal_slot_code: mealSlot.code,
          headcount,
        })
      }
    }
  }
  return rules
}

watch(() => store.current, (preferences) => {
  if (!preferences) return
  const mealSlots = preferences.meal_slots?.length ? preferences.meal_slots : defaultMealSlots
  form.mealSlots = joinValues([...mealSlots].sort((a, b) => a.position - b.position).map((slot) => slot.label))
  form.excludedIngredients = joinValues(preferences.exclusions.ingredients)
  form.excludedGroups = joinValues(preferences.exclusions.groups)
  form.favoriteRecipes = joinValues(preferences.favorites.recipes)
}, { immediate: true })

const fetchHouseholdSchedule = async (): Promise<void> => {
  scheduleLoading.value = true
  scheduleError.value = null
  try {
    const response = await householdScheduleService.get()
    schedule.value = response.payload
    scheduleEtag.value = response.etag
    applyScheduleToForm(response.payload)
  } catch (err) {
    scheduleError.value = err instanceof Error ? err.message : 'Chargement impossible.'
  } finally {
    scheduleLoading.value = false
  }
}

const fetchVacationPeriods = async (): Promise<void> => {
  vacationError.value = null
  try {
    vacationPeriods.value = await householdScheduleService.listVacationPeriods()
  } catch (err) {
    vacationError.value = err instanceof Error ? err.message : 'Chargement des vacances impossible.'
  }
}

const save = async (): Promise<void> => {
  if (!scheduleEtag.value) throw new Error('Planning foyer non chargé.')
  scheduleSaving.value = true
  scheduleError.value = null
  successMessage.value = null
  try {
    await store.updatePreferences({
      exclusions: {
        ingredients: splitValues(form.excludedIngredients),
        groups: splitValues(form.excludedGroups),
      },
      favorites: {
        recipes: splitValues(form.favoriteRecipes),
      },
      meal_slots: activeMealSlots.value,
    })

    const response = await householdScheduleService.update(scheduleEtag.value, {
      school_zone: schoolZone.value || null,
      rules: buildScheduleRules(),
    })
    schedule.value = response.payload
    scheduleEtag.value = response.etag
    applyScheduleToForm(response.payload)
    successMessage.value = 'Enregistré.'
  } catch (err) {
    scheduleError.value = err instanceof Error ? err.message : 'Enregistrement impossible.'
  } finally {
    scheduleSaving.value = false
  }
}

const vacationPayload = (): SchoolVacationPeriodPayload => ({
  source: vacationForm.source,
  school_zone: vacationForm.source === 'official' && vacationForm.schoolZone ? vacationForm.schoolZone : null,
  name: vacationForm.name.trim(),
  start_date: vacationForm.startDate,
  end_date: vacationForm.endDate,
})

const addVacationPeriod = async (): Promise<void> => {
  vacationSaving.value = true
  vacationError.value = null
  try {
    const response = await householdScheduleService.createVacationPeriod(vacationPayload())
    vacationEtags[response.payload.uuid] = response.etag
    vacationPeriods.value = [...vacationPeriods.value, response.payload]
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
    vacationForm.name = ''
    vacationForm.startDate = ''
    vacationForm.endDate = ''
  } catch (err) {
    vacationError.value = err instanceof Error ? err.message : 'Ajout impossible.'
  } finally {
    vacationSaving.value = false
  }
}

const removeVacationPeriod = async (period: SchoolVacationPeriod): Promise<void> => {
  vacationError.value = null
  try {
    await householdScheduleService.removeVacationPeriod(period.uuid, vacationEtags[period.uuid] || `W/"${period.version}"`)
    vacationPeriods.value = vacationPeriods.value.filter((item) => item.uuid !== period.uuid)
    delete vacationEtags[period.uuid]
  } catch (err) {
    vacationError.value = err instanceof Error ? err.message : 'Suppression impossible.'
  }
}

const formatVacationSource = (period: SchoolVacationPeriod): string => {
  if (period.source === 'manual') return 'Manuelle'
  return period.school_zone ? `Officielle zone ${period.school_zone}` : 'Officielle'
}

onMounted(() => {
  void store.fetchPreferences()
  void fetchHouseholdSchedule()
  void fetchVacationPeriods()
})
</script>

<template>
  <main class="planning-preferences">
    <RouterLink :to="{ name: 'planning-list' }" class="planning-preferences__back">Retour aux plans</RouterLink>

    <header class="planning-preferences__header">
      <p>Préférences tenant</p>
      <h1>Contraintes de planification</h1>
    </header>

    <p v-if="store.error || scheduleError" class="planning-preferences__error">
      {{ store.error || scheduleError }}
    </p>
    <p v-else-if="store.loading || scheduleLoading" class="planning-preferences__muted">Chargement…</p>
    <p v-if="successMessage" class="planning-preferences__success">{{ successMessage }}</p>

    <form class="planning-preferences__form" @submit.prevent="save">
      <section class="planning-preferences__section">
        <div class="planning-preferences__section-header">
          <h2>Repas et contraintes</h2>
        </div>

        <div class="planning-preferences__split">
          <label>
            Repas
            <textarea v-model="form.mealSlots" rows="4" />
          </label>
          <label>
            Zone scolaire
            <select v-model="schoolZone">
              <option value="">Non renseignée</option>
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
            </select>
          </label>
        </div>

        <div class="planning-preferences__split planning-preferences__split--three">
          <label>
            Ingrédients exclus
            <textarea v-model="form.excludedIngredients" rows="6" />
          </label>
          <label>
            Groupes exclus
            <textarea v-model="form.excludedGroups" rows="6" />
          </label>
          <label>
            Recettes favorites
            <textarea v-model="form.favoriteRecipes" rows="6" />
          </label>
        </div>
      </section>

      <section class="planning-preferences__section">
        <div class="planning-preferences__section-header">
          <h2>Planning foyer</h2>
        </div>

        <div class="schedule-templates">
          <article v-for="template in scheduleTemplates" :key="template.id" class="schedule-template">
            <h3>{{ template.label }}</h3>
            <div class="schedule-table-wrapper">
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th scope="col">Repas</th>
                    <th v-for="day in days" :key="`${template.id}-${day.code}`" scope="col">
                      {{ day.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="mealSlot in activeMealSlots" :key="`${template.id}-${mealSlot.code}`">
                    <th scope="row">{{ mealSlot.label }}</th>
                    <td v-for="day in days" :key="`${template.id}-${mealSlot.code}-${day.code}`">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="1"
                        inputmode="numeric"
                        :aria-label="`${template.label} ${day.label} ${mealSlot.label}`"
                        :value="ruleHeadcounts[ruleKey(template, day.code, mealSlot.code)] ?? ''"
                        @input="setRuleValue(ruleKey(template, day.code, mealSlot.code), $event)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <div class="planning-preferences__actions">
        <AppButton type="submit" :disabled="store.loading || scheduleLoading || scheduleSaving">
          {{ scheduleSaving ? 'Enregistrement…' : 'Enregistrer' }}
        </AppButton>
      </div>
    </form>

    <section class="planning-preferences__section planning-preferences__section--standalone">
      <div class="planning-preferences__section-header">
        <h2>Vacances scolaires</h2>
      </div>

      <p v-if="vacationError" class="planning-preferences__error">{{ vacationError }}</p>

      <form class="vacation-form" @submit.prevent="addVacationPeriod">
        <label>
          Source
          <select v-model="vacationForm.source">
            <option value="manual">Manuelle</option>
            <option value="official">Officielle</option>
          </select>
        </label>
        <label>
          Zone
          <select v-model="vacationForm.schoolZone" :disabled="vacationForm.source === 'manual'">
            <option value="">Toutes</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label>
          Nom
          <input v-model="vacationForm.name" required />
        </label>
        <label>
          Début
          <input v-model="vacationForm.startDate" type="date" required />
        </label>
        <label>
          Fin
          <input v-model="vacationForm.endDate" type="date" required />
        </label>
        <AppButton type="submit" variant="secondary" :disabled="vacationSaving">
          {{ vacationSaving ? 'Ajout…' : 'Ajouter' }}
        </AppButton>
      </form>

      <div class="vacation-list">
        <div v-if="!vacationPeriods.length" class="vacation-list__empty">Aucune période.</div>
        <div v-for="period in vacationPeriods" :key="period.uuid" class="vacation-row">
          <div>
            <strong>{{ period.name }}</strong>
            <span>{{ formatVacationSource(period) }}</span>
          </div>
          <div class="vacation-row__dates">{{ period.start_date }} → {{ period.end_date }}</div>
          <AppButton variant="danger" :aria-label="`Supprimer ${period.name}`" @click="removeVacationPeriod(period)">
            Supprimer
          </AppButton>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.planning-preferences {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

.planning-preferences__back {
  display: inline-flex;
  margin-bottom: 16px;
}

.planning-preferences__header {
  margin-bottom: 18px;
}

.planning-preferences p {
  margin: 0;
  color: var(--color-text-secondary);
}

.planning-preferences h1 {
  margin: 4px 0 0;
  color: var(--color-text-primary);
  font-size: 2rem;
  font-weight: 700;
}

.planning-preferences h2,
.planning-preferences h3 {
  margin: 0;
  color: var(--color-text-primary);
}

.planning-preferences h2 {
  font-size: 1.15rem;
}

.planning-preferences h3 {
  font-size: 1rem;
}

.planning-preferences__form,
.planning-preferences__section {
  display: grid;
  gap: 20px;
}

.planning-preferences__section {
  padding: 20px 0;
  border-top: 1px solid var(--color-border);
}

.planning-preferences__section--standalone {
  margin-top: 8px;
}

.planning-preferences__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.planning-preferences__split {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(180px, 1fr);
  gap: 16px;
}

.planning-preferences__split--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.planning-preferences label,
.vacation-form label {
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
}

.planning-preferences textarea,
.planning-preferences select,
.planning-preferences input,
.vacation-form select,
.vacation-form input {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 9px 10px;
}

.planning-preferences textarea {
  resize: vertical;
}

.planning-preferences select:disabled {
  background: var(--color-background-disabled);
  color: var(--color-text-tertiary);
}

.schedule-templates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 560px), 1fr));
  gap: 18px;
}

.schedule-template {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.schedule-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.schedule-table {
  width: 100%;
  min-width: 536px;
  border-collapse: collapse;
  table-layout: fixed;
}

.schedule-table th,
.schedule-table td {
  border: 1px solid var(--color-border);
  padding: 4px;
  text-align: center;
}

.schedule-table th {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
}

.schedule-table thead th:first-child,
.schedule-table tbody th {
  width: 92px;
  text-align: left;
  white-space: nowrap;
}

.schedule-table tbody th {
  color: var(--color-text-primary);
  font-size: 0.8rem;
}

.schedule-table td {
  height: 34px;
}

.schedule-table input {
  width: 42px;
  min-height: 26px;
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  text-align: center;
  font-size: 0.88rem;
  font-weight: 700;
}

.planning-preferences__actions {
  display: flex;
  justify-content: flex-start;
}

.vacation-form {
  display: grid;
  grid-template-columns: 130px 110px minmax(160px, 1fr) 150px 150px auto;
  align-items: end;
  gap: 12px;
}

.vacation-list {
  display: grid;
  gap: 8px;
}

.vacation-list__empty,
.vacation-row {
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.vacation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
}

.vacation-row strong,
.vacation-row span {
  display: block;
}

.vacation-row span,
.vacation-row__dates,
.vacation-list__empty {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.planning-preferences__error {
  margin-bottom: 14px;
  color: var(--color-danger);
}

.planning-preferences__success {
  margin-bottom: 14px;
  color: var(--color-success);
}

.planning-preferences__muted {
  margin-bottom: 14px;
}

@media (max-width: 860px) {
  .planning-preferences__split,
  .planning-preferences__split--three,
  .vacation-form,
  .vacation-row {
    grid-template-columns: 1fr;
  }
}
</style>
