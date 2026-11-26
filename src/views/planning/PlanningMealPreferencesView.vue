<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import PlanningSettingsShell from '@/components/planning/PlanningSettingsShell.vue'
import { useTenantPreferencesStore } from '@/stores/tenantPreferencesStore'
import type { MealSlotDefinition } from '@/types/tenantPreferences'

const store = useTenantPreferencesStore()
const saving = ref(false)
const success = ref<string | null>(null)

const defaultMealSlots: MealSlotDefinition[] = [
  { code: 'lunch', label: 'Déjeuner', position: 0 },
  { code: 'dinner', label: 'Dîner', position: 1 },
]

const form = reactive({
  mealSlots: 'Déjeuner\nDîner',
  excludedIngredients: '',
  excludedGroups: '',
  favoriteRecipes: '',
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
  return ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const mealSlots = computed<MealSlotDefinition[]>(() => {
  const labels = splitValues(form.mealSlots)
  const source = labels.length ? labels : defaultMealSlots.map((slot) => slot.label)
  const seen = new Set<string>()
  return source.flatMap((label, index) => {
    const code = normalizeMealSlotCode(label) || `repas-${index + 1}`
    if (seen.has(code)) return []
    seen.add(code)
    return [{ code, label, position: index }]
  })
})

watch(() => store.current, (preferences) => {
  if (!preferences) return
  const configuredSlots = preferences.meal_slots.length ? preferences.meal_slots : defaultMealSlots
  form.mealSlots = joinValues([...configuredSlots].sort((a, b) => a.position - b.position).map((slot) => slot.label))
  form.excludedIngredients = joinValues(preferences.exclusions.ingredients)
  form.excludedGroups = joinValues(preferences.exclusions.groups)
  form.favoriteRecipes = joinValues(preferences.favorites.recipes)
}, { immediate: true })

const save = async (): Promise<void> => {
  saving.value = true
  success.value = null
  try {
    await store.updatePreferences({
      exclusions: {
        ingredients: splitValues(form.excludedIngredients),
        groups: splitValues(form.excludedGroups),
      },
      favorites: {
        recipes: splitValues(form.favoriteRecipes),
      },
      meal_slots: mealSlots.value,
    })
    success.value = 'Repas et préférences enregistrés.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void store.fetchPreferences()
})
</script>

<template>
  <PlanningSettingsShell
    eyebrow="Configuration"
    title="Repas et préférences"
    description="Définissez les créneaux visibles dans le planning ainsi que les exclusions et recettes favorites utilisées pour les suggestions."
  >
    <p v-if="store.loading" class="meal-preferences__muted">Chargement…</p>
    <p v-if="store.error" class="meal-preferences__error">{{ store.error }}</p>
    <p v-if="success" class="meal-preferences__success">{{ success }}</p>

    <form class="meal-preferences__form" @submit.prevent="save">
      <section class="meal-preferences__section">
        <div>
          <h2>Créneaux de repas</h2>
          <p>Un créneau par ligne, dans l’ordre d’affichage du calendrier.</p>
        </div>
        <label>
          Repas
          <textarea v-model="form.mealSlots" rows="5" />
        </label>
      </section>

      <section class="meal-preferences__section">
        <div>
          <h2>Préférences du foyer</h2>
          <p>Une valeur par ligne. Ces informations seront accessibles à l’agent de planification.</p>
        </div>
        <div class="meal-preferences__grid">
          <label>
            Ingrédients exclus
            <textarea v-model="form.excludedIngredients" rows="8" />
          </label>
          <label>
            Groupes exclus
            <textarea v-model="form.excludedGroups" rows="8" />
          </label>
          <label>
            Recettes favorites
            <textarea v-model="form.favoriteRecipes" rows="8" />
          </label>
        </div>
      </section>

      <AppButton type="submit" :disabled="store.loading || saving">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </AppButton>
    </form>
  </PlanningSettingsShell>
</template>

<style scoped>
.meal-preferences__form,
.meal-preferences__section {
  display: grid;
  gap: 18px;
}

.meal-preferences__section {
  padding: 24px 0;
  border-top: 1px solid var(--color-border);
}

.meal-preferences__section h2,
.meal-preferences__section p {
  margin: 0;
}

.meal-preferences__section h2 {
  color: var(--color-text-primary);
  font-size: 1.2rem;
}

.meal-preferences__section p {
  margin-top: 5px;
  color: var(--color-text-secondary);
}

.meal-preferences__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.meal-preferences label {
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
}

.meal-preferences textarea,
.meal-preferences__section textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.meal-preferences__muted,
.meal-preferences__error,
.meal-preferences__success {
  margin: 0 0 14px;
}

.meal-preferences__muted {
  color: var(--color-text-secondary);
}

.meal-preferences__error {
  color: var(--color-danger);
}

.meal-preferences__success {
  color: var(--color-success);
}

@media (max-width: 800px) {
  .meal-preferences__grid {
    grid-template-columns: 1fr;
  }
}
</style>
