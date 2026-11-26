<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import PlanningSettingsShell from '@/components/planning/PlanningSettingsShell.vue'
import SchoolZonePicker from '@/components/planning/SchoolZonePicker.vue'
import { householdScheduleService } from '@/services/householdScheduleService'
import type { HouseholdSchedule, SchoolVacationPeriod, SchoolZone } from '@/types/householdSchedule'
import { reconcileSynchronizedVacationPeriods } from '@/utils/vacationPeriods'

const schedule = ref<HouseholdSchedule | null>(null)
const scheduleEtag = ref('')
const schoolZone = ref<SchoolZone | ''>('')
const vacationPeriods = ref<SchoolVacationPeriod[]>([])
const loading = ref(true)
const savingZone = ref(false)
const syncing = ref(false)
const savingManual = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const manualForm = reactive({
  name: '',
  startDate: '',
  endDate: '',
})

const officialPeriods = computed(() => vacationPeriods.value.filter((period) =>
  period.source === 'official' && (!schoolZone.value || period.school_zone === schoolZone.value),
))
const manualPeriods = computed(() => vacationPeriods.value.filter((period) => period.source === 'manual'))

const formatDate = (value: string): string => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${value}T12:00:00`))

const load = async (): Promise<void> => {
  loading.value = true
  error.value = null
  try {
    const [scheduleResponse, periods] = await Promise.all([
      householdScheduleService.get(),
      householdScheduleService.listVacationPeriods(),
    ])
    schedule.value = scheduleResponse.payload
    scheduleEtag.value = scheduleResponse.etag
    schoolZone.value = scheduleResponse.payload.school_zone ?? ''
    vacationPeriods.value = periods
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chargement des vacances impossible.'
  } finally {
    loading.value = false
  }
}

const saveZone = async (selectedZone: SchoolZone | ''): Promise<void> => {
  if (!scheduleEtag.value) return
  if (selectedZone === schoolZone.value) return
  const previousZone = schedule.value?.school_zone ?? null
  schoolZone.value = selectedZone
  savingZone.value = true
  error.value = null
  success.value = null
  try {
    const response = await householdScheduleService.updateSchoolZone(
      scheduleEtag.value,
      selectedZone || null,
    )
    schedule.value = response.payload
    scheduleEtag.value = response.etag
    success.value = selectedZone ? `Zone ${selectedZone} enregistrée.` : 'Zone scolaire retirée.'
  } catch (err) {
    schoolZone.value = previousZone ?? ''
    error.value = err instanceof Error ? err.message : 'Enregistrement de la zone impossible.'
  } finally {
    savingZone.value = false
  }
}

const syncOfficialCalendar = async (): Promise<void> => {
  if (!schoolZone.value) {
    error.value = 'Choisissez une zone scolaire avant de récupérer le calendrier.'
    return
  }
  syncing.value = true
  error.value = null
  success.value = null
  try {
    const result = await householdScheduleService.syncOfficialVacationPeriods({
      school_zone: schoolZone.value,
    })
    vacationPeriods.value = reconcileSynchronizedVacationPeriods(
      vacationPeriods.value,
      result.periods,
      result.school_zone,
    )
    success.value = `Calendrier zone ${result.school_zone} synchronisé : ${result.created} ajoutée(s), ${result.updated} mise(s) à jour, ${result.deleted} retirée(s).`
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Synchronisation du calendrier impossible.'
  } finally {
    syncing.value = false
  }
}

const addManualPeriod = async (): Promise<void> => {
  savingManual.value = true
  error.value = null
  success.value = null
  try {
    const response = await householdScheduleService.createVacationPeriod({
      source: 'manual',
      school_zone: null,
      name: manualForm.name.trim(),
      start_date: manualForm.startDate,
      end_date: manualForm.endDate,
    })
    vacationPeriods.value = [...vacationPeriods.value, response.payload]
      .sort((left, right) => left.start_date.localeCompare(right.start_date))
    manualForm.name = ''
    manualForm.startDate = ''
    manualForm.endDate = ''
    success.value = 'Période manuelle ajoutée.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Ajout de la période impossible.'
  } finally {
    savingManual.value = false
  }
}

const removeManualPeriod = async (period: SchoolVacationPeriod): Promise<void> => {
  error.value = null
  success.value = null
  try {
    await householdScheduleService.removeVacationPeriod(period.uuid, `W/"${period.version}"`)
    vacationPeriods.value = vacationPeriods.value.filter((item) => item.uuid !== period.uuid)
    success.value = 'Période manuelle supprimée.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Suppression impossible.'
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <PlanningSettingsShell title="Vacances scolaires">
    <p v-if="loading" class="vacations-page__muted">Chargement…</p>
    <p v-if="error" class="vacations-page__error">{{ error }}</p>
    <p v-if="success" class="vacations-page__success">{{ success }}</p>

    <section class="vacations-page__section">
      <div>
        <p class="vacations-page__step">Étape 1</p>
        <h2>Zone scolaire</h2>
        <p>La zone détermine quelles périodes officielles activent les règles « vacances ».</p>
      </div>
      <div class="vacations-page__zone-form">
        <SchoolZonePicker
          :model-value="schoolZone"
          :disabled="savingZone || syncing || loading"
          @update:model-value="saveZone"
        />
        <span v-if="savingZone" class="vacations-page__saving">Enregistrement…</span>
      </div>
    </section>

    <section class="vacations-page__section">
      <div class="vacations-page__section-heading">
        <div>
          <p class="vacations-page__step">Étape 2</p>
          <h2>Calendrier officiel</h2>
          <p>Les dates sont importées depuis le jeu de données officiel de l’Éducation nationale.</p>
        </div>
        <AppButton
          type="button"
          :disabled="syncing || savingZone || !schoolZone || schedule?.school_zone !== schoolZone"
          @click="syncOfficialCalendar"
        >
          {{ syncing ? 'Mise à jour…' : 'Ajuster avec le calendrier officiel' }}
        </AppButton>
      </div>

      <div class="vacations-page__periods">
        <p v-if="!officialPeriods.length" class="vacations-page__empty">
          Aucun calendrier officiel synchronisé pour le moment.
        </p>
        <article v-for="period in officialPeriods" :key="period.uuid" class="vacations-page__period">
          <div>
            <strong>{{ period.name }}</strong>
            <span>Zone {{ period.school_zone }}</span>
          </div>
          <time>{{ formatDate(period.start_date) }} → {{ formatDate(period.end_date) }}</time>
        </article>
      </div>
    </section>

    <section class="vacations-page__section">
      <div>
        <p class="vacations-page__step">Optionnel</p>
        <h2>Périodes propres au foyer</h2>
        <p>Ajoutez ici un congé ou une période qui ne dépend pas du calendrier scolaire.</p>
      </div>

      <form class="vacations-page__manual-form" @submit.prevent="addManualPeriod">
        <label>
          Nom
          <input v-model="manualForm.name" required placeholder="Vacances familiales" />
        </label>
        <label>
          Début
          <input v-model="manualForm.startDate" type="date" required />
        </label>
        <label>
          Fin
          <input v-model="manualForm.endDate" type="date" required />
        </label>
        <AppButton type="submit" variant="secondary" :disabled="savingManual">
          {{ savingManual ? 'Ajout…' : 'Ajouter' }}
        </AppButton>
      </form>

      <div class="vacations-page__periods">
        <article v-for="period in manualPeriods" :key="period.uuid" class="vacations-page__period">
          <div>
            <strong>{{ period.name }}</strong>
            <span>Période manuelle</span>
          </div>
          <time>{{ formatDate(period.start_date) }} → {{ formatDate(period.end_date) }}</time>
          <AppButton variant="danger" @click="removeManualPeriod(period)">Supprimer</AppButton>
        </article>
      </div>
    </section>
  </PlanningSettingsShell>
</template>

<style scoped>
.vacations-page__section {
  display: grid;
  gap: 18px;
  padding: 24px 0;
  border-top: 1px solid var(--color-border);
}

.vacations-page__section h2,
.vacations-page__section p {
  margin: 0;
}

.vacations-page__section h2 {
  color: var(--color-text-primary);
  font-size: 1.2rem;
}

.vacations-page__section p {
  margin-top: 5px;
  color: var(--color-text-secondary);
}

.vacations-page__step {
  color: var(--color-primary) !important;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.vacations-page__section-heading,
.vacations-page__zone-form,
.vacations-page__period {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.vacations-page__zone-form {
  align-items: stretch;
  flex-direction: column;
}

.vacations-page__saving {
  align-self: end;
  min-height: 42px;
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
}

.vacations-page__manual-form label {
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
}

.vacations-page input,
.vacations-page__manual-form input {
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.vacations-page__manual-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 160px 160px auto;
  align-items: end;
  gap: 12px;
}

.vacations-page__periods {
  display: grid;
  gap: 8px;
}

.vacations-page__period,
.vacations-page__empty {
  padding: 13px 15px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.vacations-page__period strong,
.vacations-page__period span {
  display: block;
}

.vacations-page__period span,
.vacations-page__period time,
.vacations-page__empty,
.vacations-page__muted {
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.vacations-page__error,
.vacations-page__success {
  margin: 0 0 14px;
}

.vacations-page__error {
  color: var(--color-danger);
}

.vacations-page__success {
  color: var(--color-success);
}

@media (max-width: 760px) {
  .vacations-page__section-heading,
  .vacations-page__zone-form,
  .vacations-page__period {
    align-items: stretch;
    flex-direction: column;
  }

  .vacations-page__manual-form {
    grid-template-columns: 1fr;
  }
}
</style>
