<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PlanningSettingsShell from '@/components/planning/PlanningSettingsShell.vue'
import { householdScheduleService } from '@/services/householdScheduleService'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type { HouseholdSchedule, SchoolVacationPeriod } from '@/types/householdSchedule'

const membersStore = useHouseholdMembersStore()
const preferencesStore = useTenantPreferencesStore()
const schedule = ref<HouseholdSchedule | null>(null)
const vacationPeriods = ref<SchoolVacationPeriod[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const activeOfficialPeriods = computed(() =>
  vacationPeriods.value.filter((period) => period.source === 'official' && period.school_zone === schedule.value?.school_zone),
)

const cards = computed(() => [
  {
    route: 'planning-settings-people',
    icon: 'P',
    title: 'Personnes',
    description: 'Définir les membres du foyer et les invités réguliers.',
    status: membersStore.members.length
      ? `${membersStore.members.length} personne${membersStore.members.length > 1 ? 's' : ''}`
      : 'À configurer',
    required: !membersStore.members.length,
  },
  {
    route: 'planning-settings-vacations',
    icon: 'A·B·C',
    title: 'Vacances scolaires',
    description: 'Choisir la zone et synchroniser le calendrier officiel.',
    status: schedule.value?.school_zone
      ? `Zone ${schedule.value.school_zone} · ${activeOfficialPeriods.value.length} période${activeOfficialPeriods.value.length > 1 ? 's' : ''}`
      : 'Zone à définir',
    required: !schedule.value?.school_zone,
  },
  {
    route: 'planning-settings-attendance',
    icon: '✓',
    title: 'Présences aux repas',
    description: 'Indiquer qui est présent selon les semaines, les jours et les vacances.',
    status: schedule.value?.rules.length
      ? `${schedule.value.rules.length} créneau${schedule.value.rules.length > 1 ? 'x' : ''} configuré${schedule.value.rules.length > 1 ? 's' : ''}`
      : 'Aucune présence définie',
    required: false,
  },
  {
    route: 'planning-settings-meals',
    icon: 'R',
    title: 'Repas et préférences',
    description: 'Configurer les repas, exclusions et recettes favorites.',
    status: `${preferencesStore.current?.meal_slots.length ?? 0} type${(preferencesStore.current?.meal_slots.length ?? 0) > 1 ? 's' : ''} de repas`,
    required: false,
  },
])

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const [scheduleResponse, periods] = await Promise.all([
      householdScheduleService.get(),
      householdScheduleService.listVacationPeriods(),
      membersStore.fetchMembers(),
      preferencesStore.fetchPreferences(),
    ])
    schedule.value = scheduleResponse.payload
    vacationPeriods.value = periods
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chargement de la configuration impossible.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PlanningSettingsShell
    eyebrow="Planification"
    title="Configuration"
    description="Chaque sujet dispose de sa propre page. Commencez par les personnes : elles sont obligatoires pour utiliser le planning."
    back-to="planning"
  >
    <p v-if="loading" class="settings-hub__message">Chargement…</p>
    <p v-if="error || membersStore.error || preferencesStore.error" class="settings-hub__error">
      {{ error || membersStore.error || preferencesStore.error }}
    </p>

    <section class="settings-hub" aria-label="Rubriques de configuration">
      <RouterLink
        v-for="card in cards"
        :key="card.route"
        :to="{ name: card.route }"
        class="settings-hub__card"
      >
        <span class="settings-hub__icon" aria-hidden="true">{{ card.icon }}</span>
        <div class="settings-hub__content">
          <div class="settings-hub__title-line">
            <h2>{{ card.title }}</h2>
            <span v-if="card.required" class="settings-hub__required">Requis</span>
          </div>
          <p>{{ card.description }}</p>
          <strong>{{ card.status }}</strong>
        </div>
        <span class="settings-hub__arrow" aria-hidden="true">→</span>
      </RouterLink>
    </section>
  </PlanningSettingsShell>
</template>

<style scoped>
.settings-hub {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.settings-hub__card {
  min-height: 180px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--transition-base), transform var(--transition-base), box-shadow var(--transition-base);
}

.settings-hub__card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 42%, var(--color-border));
  color: inherit;
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.settings-hub__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-primary);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.settings-hub__content {
  min-width: 0;
}

.settings-hub__title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-hub h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.12rem;
}

.settings-hub p {
  margin: 7px 0 18px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.settings-hub strong {
  color: var(--color-primary);
  font-size: 0.88rem;
}

.settings-hub__required {
  padding: 3px 7px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-danger) 10%, var(--color-surface));
  color: var(--color-danger);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}

.settings-hub__arrow {
  color: var(--color-text-tertiary);
  font-size: 1.2rem;
}

.settings-hub__message,
.settings-hub__error {
  margin: 0 0 16px;
}

.settings-hub__message {
  color: var(--color-text-secondary);
}

.settings-hub__error {
  color: var(--color-danger);
}

@media (max-width: 760px) {
  .settings-hub {
    grid-template-columns: 1fr;
  }
}
</style>
