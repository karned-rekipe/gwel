<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import { useIngredientEnrichmentRuns } from '@/composables/useCatalogQueries'

const page = ref(1)
const { data, isLoading, isError, error, isFetching } = useIngredientEnrichmentRuns(page)

const runs = computed(() => data.value?.data ?? [])
const pagination = computed(() => data.value?.pagination)

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const metadataLabel = (value: Record<string, unknown>): string => {
  const score = value.completeness_score
  const created = value.suggestion_created
  const parts: string[] = []
  if (typeof score === 'number') parts.push(`${score} %`)
  if (typeof created === 'boolean') parts.push(created ? 'suggestion créée' : 'suggestion réutilisée')
  return parts.join(' · ') || '—'
}

const previousPage = (): void => {
  if (page.value > 1) page.value -= 1
}

const nextPage = (): void => {
  if (pagination.value?.has_next) page.value += 1
}
</script>

<template>
  <main class="runs-page">
    <header class="runs-page__header">
      <div>
        <h1>Runs ingrédients</h1>
        <p>Exécutions de l’agent d’enrichissement V5.</p>
      </div>
      <div class="runs-page__pager">
        <AppButton variant="secondary" :disabled="!pagination?.has_prev || isFetching" @click="previousPage">
          Précédent
        </AppButton>
        <span>Page {{ pagination?.page ?? page }}</span>
        <AppButton variant="secondary" :disabled="!pagination?.has_next || isFetching" @click="nextPage">
          Suivant
        </AppButton>
      </div>
    </header>

    <section class="runs-page__panel">
      <div v-if="isLoading" class="runs-page__state">
        <AppLoader variant="spinner" />
      </div>
      <p v-else-if="isError" class="runs-page__state runs-page__state--error">
        {{ error?.message || 'Chargement impossible.' }}
      </p>
      <p v-else-if="!runs.length" class="runs-page__state">Aucun run.</p>
      <div v-else class="runs-page__table">
        <article class="runs-page__row runs-page__row--head">
          <span>Statut</span>
          <span>Ingrédient</span>
          <span>Suggestion</span>
          <span>Champs</span>
          <span>Début</span>
          <span>Fin</span>
          <span>Résumé</span>
        </article>
        <article v-for="run in runs" :key="run.uuid" class="runs-page__row">
          <strong :class="['runs-page__status', `runs-page__status--${run.status}`]">{{ run.status }}</strong>
          <router-link :to="{ name: 'ingredients-detail', params: { id: run.ingredient_uuid } }">
            {{ run.ingredient_uuid }}
          </router-link>
          <span>{{ run.suggestion_uuid || '—' }}</span>
          <span>{{ run.proposed_fields.join(', ') || '—' }}</span>
          <span>{{ formatDate(run.started_at) }}</span>
          <span>{{ formatDate(run.completed_at) }}</span>
          <span>{{ run.error || metadataLabel(run.metadata) }}</span>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.runs-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 56px;
}

.runs-page__header,
.runs-page__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.runs-page__header {
  margin-bottom: 16px;
}

.runs-page__header h1,
.runs-page__header p {
  margin: 0;
}

.runs-page__header p,
.runs-page__row {
  color: var(--color-text-secondary);
}

.runs-page__pager {
  flex-wrap: wrap;
}

.runs-page__panel {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.runs-page__state {
  margin: 0;
  padding: 18px;
  background: var(--color-surface);
}

.runs-page__state--error {
  color: var(--color-danger);
  font-weight: 650;
}

.runs-page__table {
  display: grid;
  gap: 1px;
}

.runs-page__row {
  display: grid;
  grid-template-columns: 110px minmax(180px, 1fr) minmax(120px, 0.7fr) minmax(150px, 1fr) 130px 130px minmax(160px, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 980px;
  padding: 10px 12px;
  background: var(--color-surface);
  font-size: 0.86rem;
}

.runs-page__row--head {
  color: var(--color-text-primary);
  font-weight: 700;
}

.runs-page__status {
  text-transform: uppercase;
}

.runs-page__status--success {
  color: var(--color-success);
}

.runs-page__status--failed {
  color: var(--color-danger);
}

@media (max-width: 980px) {
  .runs-page__panel {
    overflow-x: auto;
  }

  .runs-page__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
