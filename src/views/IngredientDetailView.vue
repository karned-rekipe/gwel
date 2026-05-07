<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import ResourceDetailHeader from '@/components/resources/ResourceDetailHeader.vue'
import {
  useApplyIngredientEnrichmentSuggestion,
  useDeleteIngredient,
  useIngredient,
  useIngredientEnrichmentSuggestions,
  useIngredientRecipes,
  useRejectIngredientEnrichmentSuggestion,
  useRunIngredientEnrichment,
} from '@/composables/useCatalogQueries'
import { shoppingService } from '@/services/shoppingService'
import type { IngredientEnrichmentSuggestion } from '@/types/recipe'
import type { Supplier } from '@/types/shopping'

const route = useRoute()
const router = useRouter()
const ingredientUuid = computed(() => route.params.id as string)
const suppliers = ref<Supplier[]>([])

const { data: ingredient, isLoading, isError, error } = useIngredient(ingredientUuid)
const { data: recipes, isLoading: isLoadingRecipes } = useIngredientRecipes(ingredientUuid)
const { data: suggestions, isLoading: isLoadingSuggestions } = useIngredientEnrichmentSuggestions(ingredientUuid)
const { mutate: deleteIngredient, isPending: isDeleting } = useDeleteIngredient()
const { mutate: runEnrichment, isPending: isRunningEnrichment, error: runEnrichmentError } = useRunIngredientEnrichment()
const {
  mutate: applyEnrichmentSuggestion,
  isPending: isApplyingSuggestion,
  error: applySuggestionError,
} = useApplyIngredientEnrichmentSuggestion()
const {
  mutate: rejectEnrichmentSuggestion,
  isPending: isRejectingSuggestion,
  error: rejectSuggestionError,
} = useRejectIngredientEnrichmentSuggestion()
const supplierByUuid = computed(() => new Map(suppliers.value.map((supplier) => [supplier.uuid, supplier.name] as const)))
const activeSuggestions = computed(() =>
  (suggestions.value ?? []).filter((suggestion) => ['pending', 'partially_applied'].includes(suggestion.status)),
)
const missingFields = computed(() => ingredient.value?.enrichment_profile.missing_fields ?? [])
const suggestionActionError = computed(
  () => applySuggestionError.value?.message ?? rejectSuggestionError.value?.message ?? runEnrichmentError.value?.message ?? '',
)

const supplierName = (uuid: string | null | undefined): string => {
  if (!uuid) return '—'
  return supplierByUuid.value.get(uuid) ?? 'Fournisseur inconnu'
}

const fieldLabels: Record<string, string> = {
  media_profile: 'Image',
  seasonality_profile: 'Saisonnalité',
  nutrition_profile: 'Nutrition',
  sustainability_profile: 'Environnement',
  allergen_profile: 'Allergènes',
  unit_profile: 'Unités',
  package_profiles: 'Conditionnements',
  substitution_profile: 'Substitutions',
  enrichment_profile: 'Complétude',
}

const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const fieldLabel = (field: string): string => fieldLabels[field] ?? field

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

const fieldCurrentValue = (field: string): unknown => {
  if (!ingredient.value) return null
  return (ingredient.value as unknown as Record<string, unknown>)[field]
}

const proposedFields = (suggestion: IngredientEnrichmentSuggestion): string[] =>
  Object.keys(suggestion.proposed_patch)

const proposedValue = (suggestion: IngredientEnrichmentSuggestion, field: string): unknown =>
  suggestion.proposed_patch[field]

const sourceLabel = (suggestion: IngredientEnrichmentSuggestion, field: string): string =>
  suggestion.field_sources[field] ?? 'unknown'

const confidenceLabel = (suggestion: IngredientEnrichmentSuggestion, field: string): string => {
  const confidence = suggestion.field_confidences[field]
  return typeof confidence === 'number' ? `${Math.round(confidence * 100)} %` : '—'
}

const fieldDecisionLabel = (suggestion: IngredientEnrichmentSuggestion, field: string): string => {
  if (suggestion.applied_fields.includes(field)) return 'appliqué'
  if (suggestion.rejected_fields.includes(field)) return 'rejeté'
  return 'à valider'
}

const seasonalityLabel = computed(() => {
  const profile = ingredient.value?.seasonality_profile
  if (!profile || profile.availability_type === 'unknown') return 'Inconnue'
  if (profile.availability_type === 'year_round') return 'Toute saison'
  if (profile.availability_type === 'not_applicable') return 'Non applicable'

  const months = Object.entries(profile.months)
    .filter(([, score]) => Number(score) > 0)
    .map(([month]) => monthLabels[Number(month) - 1])
    .filter((label): label is string => Boolean(label))

  return months.length ? months.join(', ') : 'Saison non renseignée'
})

const allergenLabel = computed(() => {
  const allergens = ingredient.value?.allergen_profile.allergens ?? []
  const present = allergens.filter((allergen) => ['contains', 'may_contain'].includes(allergen.presence))
  return present.length ? present.map((allergen) => allergen.code).join(', ') : 'Non évalué'
})

const packageLabel = computed(() => {
  const packages = ingredient.value?.package_profiles ?? []
  return packages.length
    ? packages.map((item) => `${item.label} · ${item.net_quantity} ${item.net_unit}`).join(' ; ')
    : 'Aucun'
})

const substitutionLabel = computed(() => {
  const profile = ingredient.value?.substitution_profile
  if (!profile || profile.default_policy === 'unknown') return 'Non évaluée'
  if (profile.default_policy === 'essential_by_default') return 'Essentiel par défaut'
  return profile.substitute_ingredient_uuids.length
    ? `${profile.substitute_ingredient_uuids.length} substitution(s)`
    : 'Substituable'
})

const startEnrichment = (): void => {
  runEnrichment(ingredientUuid.value)
}

const applyField = (suggestion: IngredientEnrichmentSuggestion, field: string): void => {
  applyEnrichmentSuggestion({
    ingredientUuid: ingredientUuid.value,
    suggestionUuid: suggestion.uuid,
    payload: { fields: [field], force: false },
  })
}

const applyAllFields = (suggestion: IngredientEnrichmentSuggestion): void => {
  applyEnrichmentSuggestion({
    ingredientUuid: ingredientUuid.value,
    suggestionUuid: suggestion.uuid,
    payload: { fields: proposedFields(suggestion), force: false },
  })
}

const rejectSuggestion = (suggestion: IngredientEnrichmentSuggestion): void => {
  rejectEnrichmentSuggestion({ ingredientUuid: ingredientUuid.value, suggestionUuid: suggestion.uuid })
}

const rejectField = (suggestion: IngredientEnrichmentSuggestion, field: string): void => {
  rejectEnrichmentSuggestion({
    ingredientUuid: ingredientUuid.value,
    suggestionUuid: suggestion.uuid,
    payload: { fields: [field] },
  })
}

const goBack = (): void => {
  router.push({ name: 'ingredients-home' })
}

const removeIngredient = (): void => {
  if (!window.confirm('Supprimer cet ingrédient ?')) return
  deleteIngredient(ingredientUuid.value, {
    onSuccess: goBack,
  })
}

onMounted(async () => {
  try {
    const response = await shoppingService.listSuppliers({ per_page: 100 })
    suppliers.value = response.data
  } catch {
    suppliers.value = []
  }
})
</script>

<template>
  <main class="catalog-detail">
    <div v-if="isLoading" class="catalog-detail__state">
      <AppLoader variant="spinner" />
    </div>

    <section v-else-if="isError || !ingredient" class="catalog-detail__state">
      <h1 class="catalog-detail__title">Ingrédient introuvable</h1>
      <p class="catalog-detail__text">{{ error?.message || 'La fiche n’est pas disponible.' }}</p>
    </section>

    <template v-else>
      <ResourceDetailHeader
        eyebrow="Ingrédient"
        :title="ingredient.name"
        can-delete
        :is-deleting="isDeleting"
        @back="goBack"
        @delete="removeIngredient"
      >
        <div class="catalog-detail__meta">
          <span>Unité {{ ingredient.unit || '—' }}</span>
          <span>Groupe {{ ingredient.group?.name || '—' }}</span>
          <span>Rayon {{ ingredient.rayon?.name || '—' }}</span>
          <span>Fournisseur {{ supplierName(ingredient.main_supplier_uuid) }}</span>
          <span>Green score {{ ingredient.green_score ?? '—' }}</span>
        </div>
        <p class="catalog-detail__text">
          Fournisseurs secondaires :
          {{ ingredient.secondary_supplier_uuids.map((uuid) => supplierName(uuid)).join(', ') || '—' }}
        </p>
        <p class="catalog-detail__text">Saisonnalité : {{ Object.keys(ingredient.season_months).join(', ') || 'Toute saison' }}</p>
      </ResourceDetailHeader>

      <section class="catalog-detail__panel catalog-detail__panel--quality">
        <div class="catalog-detail__panel-heading">
          <div>
            <h2 class="catalog-detail__panel-title">Qualité V5</h2>
            <p class="catalog-detail__text">
              {{ ingredient.enrichment_profile.status }} · {{ ingredient.enrichment_profile.completeness_score }} %
            </p>
          </div>
          <AppButton :disabled="isRunningEnrichment" @click="startEnrichment">
            {{ isRunningEnrichment ? 'Enrichissement…' : 'Enrichir avec IA' }}
          </AppButton>
        </div>
        <p v-if="missingFields.length" class="catalog-detail__text">
          Champs manquants : {{ missingFields.map(fieldLabel).join(', ') }}
        </p>
        <p v-else class="catalog-detail__text">Aucun champ manquant signalé.</p>
        <p v-if="suggestionActionError" class="catalog-detail__error">{{ suggestionActionError }}</p>
      </section>

      <section class="catalog-detail__panel">
        <h2 class="catalog-detail__panel-title">Profils enrichis</h2>
        <div class="catalog-detail__profile-grid">
          <article class="catalog-detail__profile">
            <span>Image</span>
            <strong>{{ ingredient.media_profile.image_status }}</strong>
            <small>{{ ingredient.media_profile.source }}</small>
          </article>
          <article class="catalog-detail__profile">
            <span>Saisonnalité</span>
            <strong>{{ seasonalityLabel }}</strong>
            <small>{{ ingredient.seasonality_profile.source }}</small>
          </article>
          <article class="catalog-detail__profile">
            <span>Nutrition</span>
            <strong>{{ ingredient.nutrition_profile.kcal_per_100g ?? '—' }} kcal/100 g</strong>
            <small>Nutri-Score {{ ingredient.nutrition_profile.nutri_score }}</small>
          </article>
          <article class="catalog-detail__profile">
            <span>Environnement</span>
            <strong>{{ ingredient.sustainability_profile.carbon_kg_co2e_per_kg ?? '—' }} kg CO2e/kg</strong>
            <small>{{ ingredient.sustainability_profile.source }}</small>
          </article>
          <article class="catalog-detail__profile">
            <span>Allergènes</span>
            <strong>{{ allergenLabel }}</strong>
            <small>{{ ingredient.allergen_profile.source }}</small>
          </article>
          <article class="catalog-detail__profile">
            <span>Unités</span>
            <strong>{{ ingredient.unit_profile.reference_unit }}</strong>
            <small>{{ ingredient.unit_profile.allowed_units.join(', ') || 'Aucune conversion' }}</small>
          </article>
          <article class="catalog-detail__profile">
            <span>Conditionnements</span>
            <strong>{{ packageLabel }}</strong>
          </article>
          <article class="catalog-detail__profile">
            <span>Substitutions</span>
            <strong>{{ substitutionLabel }}</strong>
          </article>
        </div>
      </section>

      <section class="catalog-detail__panel">
        <div class="catalog-detail__panel-heading">
          <h2 class="catalog-detail__panel-title">Suggestions IA</h2>
          <span class="catalog-detail__count">{{ activeSuggestions.length }}</span>
        </div>
        <p v-if="isLoadingSuggestions" class="catalog-detail__text">Chargement…</p>
        <p v-else-if="!activeSuggestions.length" class="catalog-detail__text">Aucune suggestion à valider.</p>
        <template v-else>
          <article
            v-for="suggestion in activeSuggestions"
            :key="suggestion.uuid"
            class="catalog-detail__suggestion"
          >
            <header class="catalog-detail__suggestion-header">
              <div>
                <strong>{{ suggestion.status }}</strong>
                <p class="catalog-detail__text">{{ suggestion.reasoning_summary || 'Suggestion sans résumé.' }}</p>
              </div>
              <div class="catalog-detail__actions">
                <AppButton
                  variant="secondary"
                  :disabled="isApplyingSuggestion || !proposedFields(suggestion).length"
                  @click="applyAllFields(suggestion)"
                >
                  Appliquer tout
                </AppButton>
                <AppButton variant="danger" :disabled="isRejectingSuggestion" @click="rejectSuggestion(suggestion)">
                  Rejeter
                </AppButton>
              </div>
            </header>

            <div class="catalog-detail__field-list">
              <article v-for="field in proposedFields(suggestion)" :key="field" class="catalog-detail__field">
                <div class="catalog-detail__field-heading">
                <strong>{{ fieldLabel(field) }}</strong>
                <span>
                  {{ sourceLabel(suggestion, field) }} · {{ confidenceLabel(suggestion, field) }} ·
                  {{ fieldDecisionLabel(suggestion, field) }}
                </span>
              </div>
                <div class="catalog-detail__diff">
                  <div>
                    <span>Actuel</span>
                    <code>{{ formatValue(fieldCurrentValue(field)) }}</code>
                  </div>
                  <div>
                    <span>Proposé</span>
                    <code>{{ formatValue(proposedValue(suggestion, field)) }}</code>
                  </div>
                </div>
              <div class="catalog-detail__actions catalog-detail__actions--field">
                <AppButton variant="secondary" :disabled="isApplyingSuggestion" @click="applyField(suggestion, field)">
                  Appliquer ce champ
                </AppButton>
                <AppButton variant="danger" :disabled="isRejectingSuggestion" @click="rejectField(suggestion, field)">
                  Rejeter ce champ
                </AppButton>
              </div>
            </article>
            </div>
          </article>
        </template>
      </section>

      <section class="catalog-detail__panel">
        <h2 class="catalog-detail__panel-title">Recettes associées</h2>
        <p v-if="isLoadingRecipes" class="catalog-detail__text">Chargement…</p>
        <p v-else-if="!recipes?.length" class="catalog-detail__text">Aucune recette associée.</p>
        <ul v-else class="catalog-detail__list">
          <li v-for="recipe in recipes" :key="recipe.uuid" class="catalog-detail__row">
            <router-link :to="{ name: 'recipes-detail', params: { id: recipe.uuid } }">
              {{ recipe.name }}
            </router-link>
            <span>{{ recipe.servings ?? '?' }} portion{{ recipe.servings && recipe.servings > 1 ? 's' : '' }}</span>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.catalog-detail {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.catalog-detail__text,
.catalog-detail__meta,
.catalog-detail__row span {
  color: var(--color-text-secondary);
}

.catalog-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.catalog-detail__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.05;
}

.catalog-detail__panel,
.catalog-detail__state {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.catalog-detail__panel-title {
  margin: 0 0 14px;
  color: var(--color-text-primary);
  font-size: 1.1rem;
}

.catalog-detail__panel-heading,
.catalog-detail__suggestion-header,
.catalog-detail__actions,
.catalog-detail__field-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.catalog-detail__panel-heading {
  margin-bottom: 12px;
}

.catalog-detail__panel-heading .catalog-detail__panel-title,
.catalog-detail__panel-heading .catalog-detail__text,
.catalog-detail__suggestion-header .catalog-detail__text {
  margin: 0;
}

.catalog-detail__error {
  color: var(--color-danger);
  font-weight: 650;
}

.catalog-detail__profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.catalog-detail__profile,
.catalog-detail__suggestion,
.catalog-detail__field {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.catalog-detail__profile {
  display: grid;
  gap: 4px;
  padding: 12px;
}

.catalog-detail__profile span,
.catalog-detail__profile small,
.catalog-detail__field-heading span,
.catalog-detail__diff span,
.catalog-detail__count {
  color: var(--color-text-secondary);
}

.catalog-detail__suggestion {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.catalog-detail__suggestion + .catalog-detail__suggestion {
  margin-top: 12px;
}

.catalog-detail__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.catalog-detail__field-list {
  display: grid;
  gap: 10px;
}

.catalog-detail__field {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.catalog-detail__diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.catalog-detail__diff div {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.catalog-detail__diff code {
  overflow: auto;
  max-height: 180px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.catalog-detail__count {
  display: inline-flex;
  min-width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.catalog-detail__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.catalog-detail__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.catalog-detail__row:last-child {
  border-bottom: 0;
}

@media (max-width: 760px) {
  .catalog-detail__panel-heading,
  .catalog-detail__suggestion-header,
  .catalog-detail__actions,
  .catalog-detail__field-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .catalog-detail__diff {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
