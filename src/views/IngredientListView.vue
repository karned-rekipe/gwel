<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import IngredientCard from '@/components/ingredients/IngredientCard.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import {
  useCreateIngredient,
  useDeleteIngredient,
  useIngredientDuplicates,
  useIngredientGroups,
  useIngredientRayons,
  useMergeIngredientDuplicates,
  useRunIngredientEnrichment,
  useRunIngredientEnrichmentBatch,
  useUpdateIngredient,
} from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { ingredientService } from '@/services/ingredientService'
import { shoppingService } from '@/services/shoppingService'
import type { PaginationInfo } from '@/types/api'
import type { DuplicateGroup, Ingredient } from '@/types/recipe'
import type { Supplier } from '@/types/shopping'

const PER_PAGE = 72
type QualityFilter =
  | 'all'
  | 'missing'
  | 'without_image'
  | 'season_now'
  | 'with_allergen'
  | 'nutrition_unknown'
  | 'carbon_unknown'
  | 'conversion_missing'
  | 'ai_suggestion'

const router = useRouter()
const navigation = useListNavigation('ingredients')
const searchTerm = ref(navigation.state.search)
const qualityFilter = ref<QualityFilter>('all')
const ingredients = ref<Ingredient[]>([])
const suppliers = ref<Supplier[]>([])
const pagination = ref<PaginationInfo | null>(null)
const currentPage = ref(navigation.state.page || 1)
const isLoading = ref(false)
const isFetchingMore = ref(false)
const loadError = ref('')
const editingUuid = ref<string | null>(null)
const selectedIngredient = ref<Ingredient | null>(null)
const isFormModalOpen = ref(false)
const isDedupeModalOpen = ref(false)
const deleteError = ref('')
const enrichmentMessage = ref('')
const activeEnrichmentUuid = ref<string | null>(null)
const duplicateTargets = reactive<Record<string, string>>({})

const form = reactive({
  name: '',
  unit: '',
  groupUuid: '',
  rayonUuid: '',
  mainSupplierUuid: '',
  secondarySupplierUuids: [] as string[],
})

const { data: groups } = useIngredientGroups()
const { data: rayons } = useIngredientRayons()
const { data: duplicateGroups, refetch: refetchDuplicates } = useIngredientDuplicates()
const { mutate: createIngredient, isPending: isCreating } = useCreateIngredient()
const { mutate: updateIngredient, isPending: isUpdating } = useUpdateIngredient()
const { mutate: deleteIngredient, isPending: isDeleting } = useDeleteIngredient()
const { mutate: mergeDuplicates, isPending: isMerging } = useMergeIngredientDuplicates()
const { mutate: runIngredientEnrichment, isPending: isRunningIngredientEnrichment } = useRunIngredientEnrichment()
const { mutate: runEnrichmentBatch, isPending: isRunningEnrichmentBatch } = useRunIngredientEnrichmentBatch()

const currentMonth = new Date().getMonth() + 1
const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const enrichedAtFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
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

const total = computed(() => pagination.value?.total ?? ingredients.value.length)
const hasNext = computed(() => pagination.value?.has_next ?? false)
const filteredIngredients = computed(() => ingredients.value.filter(matchesQualityFilter))
const visibleIncompleteIngredients = computed(() => filteredIngredients.value.filter(isIngredientIncomplete))
const isEmpty = computed(() => !isLoading.value && filteredIngredients.value.length === 0)
const formModalTitle = computed(() => editingUuid.value ? 'Modifier un ingrédient' : 'Créer un ingrédient')
const secondarySuppliers = computed(() => suppliers.value.filter((supplier) => supplier.uuid !== form.mainSupplierUuid))
const supplierByUuid = computed(() => new Map(suppliers.value.map((supplier) => [supplier.uuid, supplier.name] as const)))
const resultSummary = computed(() => {
  const totalText = total.value > ingredients.value.length ? `sur ${total.value}` : ''
  return `${filteredIngredients.value.length} affiché${filteredIngredients.value.length > 1 ? 's' : ''} ${totalText}`.trim()
})

function matchesQualityFilter(ingredient: Ingredient): boolean {
  switch (qualityFilter.value) {
    case 'missing':
      return ingredient.enrichment_profile.missing_fields.length > 0 || ingredient.enrichment_profile.status === 'missing'
    case 'without_image':
      return !ingredient.media_profile.main_image_uri || ingredient.media_profile.image_status === 'missing'
    case 'season_now':
      return ingredient.seasonality_profile.availability_type === 'year_round'
        || Number(ingredient.seasonality_profile.months[currentMonth] ?? 0) > 0
    case 'with_allergen':
      return ingredient.allergen_profile.allergens.some((allergen) =>
        ['contains', 'may_contain'].includes(allergen.presence),
      )
    case 'nutrition_unknown':
      return ingredient.nutrition_profile.nutri_score === 'unknown'
        && ingredient.nutrition_profile.kcal_per_100g === null
        && ingredient.nutrition_profile.kcal_per_100ml === null
    case 'carbon_unknown':
      return ingredient.sustainability_profile.carbon_kg_co2e_per_kg === null
    case 'conversion_missing':
      return ingredient.unit_profile.reference_unit === 'unknown' || ingredient.unit_profile.conversions.length === 0
    case 'ai_suggestion':
      return ingredient.enrichment_profile.status === 'suggested'
    case 'all':
      return true
  }
}

function isIngredientIncomplete(ingredient: Ingredient): boolean {
  return ingredient.enrichment_profile.missing_fields.length > 0
    || ingredient.enrichment_profile.status === 'missing'
    || ingredient.enrichment_profile.status === 'partial'
}

const hasSupplier = (ingredient: Ingredient): boolean =>
  Boolean(ingredient.main_supplier_uuid || ingredient.secondary_supplier_uuids.length)

const fieldLabel = (field: string): string => fieldLabels[field] ?? field

const missingFields = (ingredient: Ingredient): string[] => ingredient.enrichment_profile.missing_fields

const hasMissingFields = (ingredient: Ingredient): boolean =>
  missingFields(ingredient).length > 0 || ['missing', 'partial'].includes(ingredient.enrichment_profile.status)

const missingStatusLabel = (ingredient: Ingredient): string => {
  const fields = missingFields(ingredient)
  if (fields.length) {
    return `${fields.length} champ${fields.length > 1 ? 's' : ''} manquant${fields.length > 1 ? 's' : ''} : ${fields.map(fieldLabel).join(', ')}`
  }
  if (hasMissingFields(ingredient)) return `Fiche ${ingredient.enrichment_profile.status}`
  return 'Aucun champ manquant'
}

const hasPendingAiSuggestion = (ingredient: Ingredient): boolean =>
  ingredient.enrichment_profile.status === 'suggested'

const hasIngredientAlert = (ingredient: Ingredient): boolean =>
  hasMissingFields(ingredient) || hasPendingAiSuggestion(ingredient)

const ingredientAlertLabel = (ingredient: Ingredient): string => {
  if (hasPendingAiSuggestion(ingredient)) return 'Suggestion IA à valider'
  return missingStatusLabel(ingredient)
}

const cardStatusLabel = (ingredient: Ingredient): string => {
  if (hasPendingAiSuggestion(ingredient)) return 'Suggestion IA'
  if (hasMissingFields(ingredient)) return 'À compléter'
  return ''
}

const ingredientImageUrl = (ingredient: Ingredient): string | null =>
  ingredient.media_profile.main_image_uri?.trim() || null

const supplierName = (uuid: string | null | undefined): string => {
  if (!uuid) return '—'
  return supplierByUuid.value.get(uuid) ?? 'Fournisseur inconnu'
}

const supplierSummary = (ingredient: Ingredient): string => {
  const names = [
    supplierName(ingredient.main_supplier_uuid),
    ...ingredient.secondary_supplier_uuids.map((uuid) => supplierName(uuid)),
  ].filter((name) => name !== '—')
  return names.length ? names.join(', ') : 'Aucun fournisseur'
}

const seasonalityLabel = (ingredient: Ingredient): string => {
  const profile = ingredient.seasonality_profile
  if (profile.availability_type === 'unknown') return 'Inconnue'
  if (profile.availability_type === 'year_round') return 'Toute saison'
  if (profile.availability_type === 'not_applicable') return 'Non applicable'

  const months = Object.entries(profile.months)
    .filter(([, score]) => Number(score) > 0)
    .map(([month]) => monthLabels[Number(month) - 1])
    .filter((label): label is string => Boolean(label))

  return months.length ? months.join(', ') : 'Saison non renseignée'
}

const nutritionLabel = (ingredient: Ingredient): string => {
  const profile = ingredient.nutrition_profile
  const kcal = profile.kcal_per_100g ?? profile.kcal_per_100ml
  if (kcal === null || kcal === undefined) return `Nutri-Score ${profile.nutri_score}`
  return `${kcal} kcal/100 ${profile.kcal_per_100g !== null ? 'g' : 'ml'}`
}

const carbonLabel = (ingredient: Ingredient): string => {
  const carbon = ingredient.sustainability_profile.carbon_kg_co2e_per_kg
  return carbon === null || carbon === undefined ? 'Non évalué' : `${carbon} kg CO2e/kg`
}

const allergenLabel = (ingredient: Ingredient): string => {
  const present = ingredient.allergen_profile.allergens.filter((allergen) =>
    ['contains', 'may_contain'].includes(allergen.presence),
  )
  return present.length ? present.map((allergen) => allergen.code).join(', ') : 'Non évalué'
}

const unitLabel = (ingredient: Ingredient): string => {
  const profile = ingredient.unit_profile
  if (profile.reference_unit === 'unknown' && !ingredient.unit) return 'Non évalué'
  return [profile.reference_unit !== 'unknown' ? profile.reference_unit : ingredient.unit, profile.allowed_units.join(', ')]
    .filter(Boolean)
    .join(' · ')
}

const packageLabel = (ingredient: Ingredient): string =>
  ingredient.package_profiles.length
    ? ingredient.package_profiles.map((item) => `${item.label} ${item.net_quantity} ${item.net_unit}`).join(' ; ')
    : 'Aucun'

const substitutionLabel = (ingredient: Ingredient): string => {
  const profile = ingredient.substitution_profile
  if (profile.default_policy === 'unknown') return 'Non évaluée'
  if (profile.default_policy === 'essential_by_default') return 'Essentiel par défaut'
  return profile.substitute_ingredient_uuids.length
    ? `${profile.substitute_ingredient_uuids.length} substitution(s)`
    : 'Substituable'
}

const completenessLabel = (ingredient: Ingredient): string =>
  `${ingredient.enrichment_profile.completeness_score} % · ${ingredient.enrichment_profile.status}`

const lastEnrichedLabel = (ingredient: Ingredient): string => {
  const value = ingredient.enrichment_profile.last_enriched_at
  if (!value) return 'Jamais'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : enrichedAtFormatter.format(parsed)
}

const enrichVisibleMissingIngredients = (): void => {
  enrichmentMessage.value = ''
  const ingredientUuids = visibleIncompleteIngredients.value.map((ingredient) => ingredient.uuid)

  if (!ingredientUuids.length) {
    enrichmentMessage.value = 'Aucun ingrédient incomplet dans la liste filtrée.'
    return
  }

  runEnrichmentBatch(
    { ingredientUuids, continueOnError: true },
    {
      onSuccess: (results) => {
        const failedCount = results.filter((result) => result.status === 'failed').length
        enrichmentMessage.value = `${results.length - failedCount} enrichissement(s) lancé(s), ${failedCount} échec(s).`
      },
      onError: (err) => {
        enrichmentMessage.value = err.message
      },
    },
  )
}

const fetchPage = async (page: number, append: boolean): Promise<void> => {
  const response = await ingredientService.getPage({
    name: searchTerm.value.trim() || undefined,
    page,
    per_page: PER_PAGE,
  })
  pagination.value = response.pagination
  currentPage.value = response.pagination.page
  ingredients.value = append ? [...ingredients.value, ...response.data] : response.data
}

const syncSelectedIngredient = (): void => {
  if (!selectedIngredient.value) return
  selectedIngredient.value = ingredients.value.find((ingredient) => ingredient.uuid === selectedIngredient.value?.uuid) ?? null
}

const reload = async (pageCount = 1): Promise<void> => {
  isLoading.value = true
  loadError.value = ''
  ingredients.value = []
  try {
    for (let page = 1; page <= pageCount; page += 1) {
      await fetchPage(page, page > 1)
    }
    syncSelectedIngredient()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Chargement impossible.'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async (): Promise<void> => {
  if (!pagination.value?.has_next) return
  isFetchingMore.value = true
  try {
    await fetchPage(pagination.value.next_page ?? currentPage.value + 1, true)
  } finally {
    isFetchingMore.value = false
  }
}

const loadRemaining = async (): Promise<void> => {
  isFetchingMore.value = true
  try {
    while (pagination.value?.has_next) {
      await fetchPage(pagination.value.next_page ?? currentPage.value + 1, true)
    }
  } finally {
    isFetchingMore.value = false
  }
}

const resetForm = (): void => {
  form.name = ''
  form.unit = ''
  form.groupUuid = ''
  form.rayonUuid = ''
  form.mainSupplierUuid = ''
  form.secondarySupplierUuids = []
  editingUuid.value = null
}

const openCreateModal = (): void => {
  resetForm()
  selectedIngredient.value = null
  isFormModalOpen.value = true
}

const editIngredient = (ingredient: Ingredient): void => {
  editingUuid.value = ingredient.uuid
  form.name = ingredient.name
  form.unit = ingredient.unit ?? ''
  form.groupUuid = ingredient.group_uuid ?? ''
  form.rayonUuid = ingredient.rayon_uuid ?? ''
  form.mainSupplierUuid = ingredient.main_supplier_uuid ?? ''
  form.secondarySupplierUuids = ingredient.secondary_supplier_uuids ?? []
  isFormModalOpen.value = true
}

const editIngredientFromInfo = (ingredient: Ingredient): void => {
  selectedIngredient.value = null
  editIngredient(ingredient)
}

const closeFormModal = (): void => {
  isFormModalOpen.value = false
  resetForm()
}

const submit = (): void => {
  const payload = {
    name: form.name.trim(),
    unit: form.unit.trim() || null,
    group_uuid: form.groupUuid || null,
    rayon_uuid: form.rayonUuid || null,
    main_supplier_uuid: form.mainSupplierUuid || null,
    secondary_supplier_uuids: form.secondarySupplierUuids.filter((uuid) => uuid && uuid !== form.mainSupplierUuid),
    green_score: null,
    quantity: null,
    season_months: {},
  }
  if (!payload.name) return

  const onSuccess = async (): Promise<void> => {
    const selectedUuid = editingUuid.value
    closeFormModal()
    await reload(currentPage.value)
    if (selectedUuid) {
      selectedIngredient.value = ingredients.value.find((ingredient) => ingredient.uuid === selectedUuid) ?? null
    }
    await refetchDuplicates()
  }

  if (editingUuid.value) {
    updateIngredient({ uuid: editingUuid.value, data: payload }, { onSuccess })
    return
  }

  createIngredient(payload, { onSuccess })
}

const enrichIngredient = (ingredient: Ingredient): void => {
  enrichmentMessage.value = ''
  activeEnrichmentUuid.value = ingredient.uuid
  runIngredientEnrichment(ingredient.uuid, {
    onSuccess: async (result) => {
      enrichmentMessage.value = `Enrichissement lancé pour ${ingredient.name} (${result.status}).`
      await reload(currentPage.value)
    },
    onError: (err) => {
      enrichmentMessage.value = err.message
    },
    onSettled: () => {
      activeEnrichmentUuid.value = null
    },
  })
}

const removeIngredient = (ingredient: Ingredient): void => {
  if (!window.confirm(`Supprimer ${ingredient.name} ?`)) return
  deleteError.value = ''
  deleteIngredient(ingredient.uuid, {
    onSuccess: async () => {
      selectedIngredient.value = null
      await reload(currentPage.value)
      await refetchDuplicates()
    },
    onError: (err) => {
      deleteError.value = err.message
    },
  })
}

const openIngredient = (ingredient: Ingredient): void => {
  selectedIngredient.value = ingredient
  navigation.save({ search: searchTerm.value, page: currentPage.value, selectedUuid: ingredient.uuid })
}

const openFullIngredient = (ingredient: Ingredient): void => {
  navigation.navigateToDetail(
    router,
    { name: 'ingredients-detail', params: { id: ingredient.uuid } },
    { search: searchTerm.value, page: currentPage.value, selectedUuid: ingredient.uuid },
  )
}

const mergeDuplicateGroup = (group: DuplicateGroup): void => {
  const targetUuid = duplicateTargets[group.normalized_name] || group.items[0]?.uuid
  if (!targetUuid) return
  mergeDuplicates(
    {
      target_uuid: targetUuid,
      duplicate_uuids: group.items.filter((item) => item.uuid !== targetUuid).map((item) => item.uuid),
    },
    {
      onSuccess: async () => {
        await reload(currentPage.value)
        await refetchDuplicates()
      },
      onError: (err) => {
        deleteError.value = err.message
      },
    },
  )
}

watch(searchTerm, async () => {
  navigation.save({ search: searchTerm.value, page: 1 })
  currentPage.value = 1
  selectedIngredient.value = null
  await reload(1)
})

onMounted(async () => {
  const pageToLoad = navigation.state.page || 1
  try {
    const supplierResponse = await shoppingService.listSuppliers({ per_page: 100 })
    suppliers.value = supplierResponse.data
  } catch {
    suppliers.value = []
  }
  await reload(pageToLoad)
  await navigation.restoreScroll()
})
</script>

<template>
  <main class="ingredient-page">
    <header class="ingredient-page__header">
      <div>
        <p>Catalogue</p>
        <h1>Mes ingrédients</h1>
        <span>{{ resultSummary }}</span>
      </div>
      <AppButton @click="openCreateModal">Nouvel ingrédient</AppButton>
    </header>

    <p v-if="deleteError" class="ingredient-page__error">{{ deleteError }}</p>
    <p v-if="enrichmentMessage" class="ingredient-page__notice">{{ enrichmentMessage }}</p>

    <section class="ingredient-page__toolbar" aria-label="Filtres ingrédients">
      <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher un ingrédient">
        <div class="ingredient-page__toolbar-actions">
          <label class="ingredient-page__filter">
            <span>Qualité</span>
            <select v-model="qualityFilter">
              <option value="all">Tous</option>
              <option value="missing">Informations manquantes</option>
              <option value="without_image">Sans image</option>
              <option value="season_now">De saison</option>
              <option value="with_allergen">Contient allergène</option>
              <option value="nutrition_unknown">Nutrition inconnue</option>
              <option value="carbon_unknown">Carbone inconnu</option>
              <option value="conversion_missing">Conversion manquante</option>
              <option value="ai_suggestion">Suggestion IA</option>
            </select>
          </label>
          <AppButton
            variant="secondary"
            :disabled="isRunningEnrichmentBatch || !visibleIncompleteIngredients.length"
            @click="enrichVisibleMissingIngredients"
          >
            {{ isRunningEnrichmentBatch ? 'Enrichissement…' : 'Enrichir les manquants' }}
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="!duplicateGroups?.length"
            @click="isDedupeModalOpen = true"
          >
            Fusion
          </AppButton>
          <router-link :to="{ name: 'ingredient-settings' }" class="ingredient-page__settings" title="Réglages ingrédients">
            ⚙
          </router-link>
        </div>
      </ResourceSearchBar>
    </section>

    <section class="ingredient-page__content" aria-live="polite">
      <p v-if="isLoading" class="ingredient-page__state">Chargement…</p>
      <p v-else-if="loadError" class="ingredient-page__state ingredient-page__state--error">{{ loadError }}</p>
      <p v-else-if="isEmpty" class="ingredient-page__state">Aucun ingrédient.</p>
      <div v-else class="ingredient-page__grid">
        <IngredientCard
          v-for="ingredient in filteredIngredients"
          :key="ingredient.uuid"
          :name="ingredient.name"
          :image-url="ingredientImageUrl(ingredient)"
          :has-alert="hasIngredientAlert(ingredient)"
          :alert-label="ingredientAlertLabel(ingredient)"
          :status-label="cardStatusLabel(ingredient)"
          @click="openIngredient(ingredient)"
        />
      </div>

      <footer v-if="hasNext && total > ingredients.length" class="ingredient-page__footer">
        <AppButton variant="secondary" :disabled="isFetchingMore" @click="loadMore">
          {{ isFetchingMore ? 'Chargement…' : `Charger ${Math.min(PER_PAGE, total - ingredients.length)} ingrédients` }}
        </AppButton>
        <AppButton variant="secondary" :disabled="isFetchingMore" @click="loadRemaining">
          Charger les {{ total - ingredients.length }} restants
        </AppButton>
      </footer>
    </section>

    <div v-if="selectedIngredient" class="ingredient-page__modal-backdrop" @click.self="selectedIngredient = null">
      <section class="ingredient-page__modal ingredient-page__modal--info" role="dialog" aria-modal="true" :aria-label="`Fiche ${selectedIngredient.name}`">
        <header class="ingredient-page__modal-header">
          <h2>{{ selectedIngredient.name }}</h2>
          <button type="button" class="ingredient-page__modal-close" aria-label="Fermer" @click="selectedIngredient = null">×</button>
        </header>

        <div class="ingredient-page__info">
          <div class="ingredient-page__info-visual">
            <img
              v-if="ingredientImageUrl(selectedIngredient)"
              :src="ingredientImageUrl(selectedIngredient) ?? ''"
              :alt="selectedIngredient.name"
            />
            <span v-else aria-hidden="true">{{ selectedIngredient.name.charAt(0).toLocaleUpperCase('fr-FR') }}</span>
          </div>

          <div class="ingredient-page__info-main">
            <div class="ingredient-page__chips">
              <span>{{ completenessLabel(selectedIngredient) }}</span>
              <span>{{ selectedIngredient.unit || 'Unité non renseignée' }}</span>
              <span>{{ selectedIngredient.group?.name || 'Groupe non renseigné' }}</span>
              <span>{{ selectedIngredient.rayon?.name || 'Rayon non renseigné' }}</span>
              <span>{{ hasSupplier(selectedIngredient) ? 'Fournisseur renseigné' : 'Sans fournisseur' }}</span>
            </div>

            <p v-if="hasIngredientAlert(selectedIngredient)" class="ingredient-page__alert">
              {{ ingredientAlertLabel(selectedIngredient) }}
            </p>

            <div class="ingredient-page__modal-actions">
              <AppButton
                variant="secondary"
                :disabled="isRunningIngredientEnrichment && activeEnrichmentUuid === selectedIngredient.uuid"
                @click="enrichIngredient(selectedIngredient)"
              >
                {{ isRunningIngredientEnrichment && activeEnrichmentUuid === selectedIngredient.uuid ? 'Enrichissement…' : 'IA' }}
              </AppButton>
              <AppButton variant="secondary" @click="editIngredientFromInfo(selectedIngredient)">Modifier</AppButton>
              <AppButton variant="secondary" @click="openFullIngredient(selectedIngredient)">Fiche complète</AppButton>
              <AppButton variant="danger" :disabled="isDeleting" @click="removeIngredient(selectedIngredient)">Supprimer</AppButton>
            </div>
          </div>
        </div>

        <div class="ingredient-page__info-grid">
          <article class="ingredient-page__info-tile">
            <span>Image</span>
            <strong>{{ selectedIngredient.media_profile.image_status }}</strong>
            <small>{{ selectedIngredient.media_profile.source }}</small>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Saisonnalité</span>
            <strong>{{ seasonalityLabel(selectedIngredient) }}</strong>
            <small>{{ selectedIngredient.seasonality_profile.source }}</small>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Nutrition</span>
            <strong>{{ nutritionLabel(selectedIngredient) }}</strong>
            <small>Nutri-Score {{ selectedIngredient.nutrition_profile.nutri_score }}</small>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Environnement</span>
            <strong>{{ carbonLabel(selectedIngredient) }}</strong>
            <small>{{ selectedIngredient.sustainability_profile.source }}</small>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Allergènes</span>
            <strong>{{ allergenLabel(selectedIngredient) }}</strong>
            <small>{{ selectedIngredient.allergen_profile.source }}</small>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Unités</span>
            <strong>{{ unitLabel(selectedIngredient) }}</strong>
            <small>{{ selectedIngredient.unit_profile.conversions.length }} conversion(s)</small>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Conditionnements</span>
            <strong>{{ packageLabel(selectedIngredient) }}</strong>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Substitutions</span>
            <strong>{{ substitutionLabel(selectedIngredient) }}</strong>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Fournisseurs</span>
            <strong>{{ supplierSummary(selectedIngredient) }}</strong>
          </article>
          <article class="ingredient-page__info-tile">
            <span>Dernier enrichissement</span>
            <strong>{{ lastEnrichedLabel(selectedIngredient) }}</strong>
          </article>
        </div>
      </section>
    </div>

    <div v-if="isFormModalOpen" class="ingredient-page__modal-backdrop" @click.self="closeFormModal">
      <section class="ingredient-page__modal" role="dialog" aria-modal="true" :aria-label="formModalTitle">
        <header class="ingredient-page__modal-header">
          <h2>{{ formModalTitle }}</h2>
          <button type="button" class="ingredient-page__modal-close" aria-label="Fermer" @click="closeFormModal">×</button>
        </header>
        <form class="ingredient-page__modal-form" @submit.prevent="submit">
          <AppInput id="ingredient-name" v-model="form.name" label="Nom" placeholder="Tomate" required />
          <AppInput id="ingredient-unit" v-model="form.unit" label="Unité" placeholder="g" />
          <label class="ingredient-page__field">
            <span>Groupe</span>
            <select v-model="form.groupUuid">
              <option value="">Aucun</option>
              <option v-for="group in groups ?? []" :key="group.uuid" :value="group.uuid">{{ group.name }}</option>
            </select>
          </label>
          <label class="ingredient-page__field">
            <span>Rayon</span>
            <select v-model="form.rayonUuid">
              <option value="">Aucun</option>
              <option v-for="rayon in rayons ?? []" :key="rayon.uuid" :value="rayon.uuid">{{ rayon.name }}</option>
            </select>
          </label>
          <label class="ingredient-page__field">
            <span>Fournisseur principal</span>
            <select v-model="form.mainSupplierUuid">
              <option value="">Aucun</option>
              <option v-for="supplier in suppliers" :key="supplier.uuid" :value="supplier.uuid">{{ supplier.name }}</option>
            </select>
          </label>
          <label class="ingredient-page__field">
            <span>Fournisseurs secondaires</span>
            <select v-model="form.secondarySupplierUuids" multiple>
              <option v-for="supplier in secondarySuppliers" :key="supplier.uuid" :value="supplier.uuid">{{ supplier.name }}</option>
            </select>
          </label>
          <div class="ingredient-page__modal-actions">
            <AppButton type="button" variant="secondary" @click="closeFormModal">Annuler</AppButton>
            <AppButton type="submit" :disabled="!form.name.trim() || isCreating || isUpdating">
              {{ editingUuid ? 'Enregistrer' : 'Créer' }}
            </AppButton>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isDedupeModalOpen" class="ingredient-page__modal-backdrop" @click.self="isDedupeModalOpen = false">
      <section class="ingredient-page__modal ingredient-page__modal--dedupe" role="dialog" aria-modal="true" aria-label="Fusion des doublons">
        <header class="ingredient-page__modal-header">
          <h2>Fusion des doublons</h2>
          <button type="button" class="ingredient-page__modal-close" aria-label="Fermer" @click="isDedupeModalOpen = false">×</button>
        </header>
        <div v-if="duplicateGroups?.length" class="ingredient-page__dedupe">
          <article v-for="group in duplicateGroups" :key="group.normalized_name" class="ingredient-page__dedupe-row">
            <div>
              <strong>{{ group.normalized_name }}</strong>
              <span>{{ group.items.length }} doublons</span>
            </div>
            <select v-model="duplicateTargets[group.normalized_name]">
              <option v-for="item in group.items" :key="item.uuid" :value="item.uuid">{{ item.name }}</option>
            </select>
            <AppButton variant="secondary" :disabled="isMerging" @click="mergeDuplicateGroup(group)">
              Fusionner
            </AppButton>
          </article>
        </div>
        <p v-else class="ingredient-page__notice ingredient-page__notice--modal">Aucun doublon détecté.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ingredient-page {
  width: min(1440px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 18px 0 48px;
}

.ingredient-page__header {
  display: flex;
  gap: 16px;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 14px;
}

.ingredient-page__header div {
  min-width: 0;
}

.ingredient-page__header p,
.ingredient-page__header span {
  margin: 0;
  color: var(--color-text-secondary);
  font-weight: 650;
}

.ingredient-page__header p {
  font-size: 0.86rem;
}

.ingredient-page__header h1 {
  margin: 3px 0 3px;
  color: var(--color-text-primary);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  letter-spacing: 0;
  line-height: 1.05;
}

.ingredient-page__toolbar {
  margin-bottom: 14px;
}

.ingredient-page__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.ingredient-page__filter {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 650;
}

.ingredient-page__field {
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 650;
}

.ingredient-page__field select,
.ingredient-page__filter select,
.ingredient-page__dedupe select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

.ingredient-page__field select[multiple] {
  min-height: 84px;
}

.ingredient-page__settings {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  text-decoration: none;
}

.ingredient-page__content {
  display: grid;
  gap: 14px;
}

.ingredient-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ingredient-page__state {
  margin: 0;
  padding: 18px 0;
  color: var(--color-text-secondary);
  font-weight: 650;
}

.ingredient-page__state--error,
.ingredient-page__error {
  color: var(--color-danger);
}

.ingredient-page__error,
.ingredient-page__notice {
  margin: 0 0 10px;
  font-weight: 650;
}

.ingredient-page__notice {
  color: var(--color-text-secondary);
}

.ingredient-page__notice--modal {
  padding: 16px 18px 18px;
}

.ingredient-page__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.ingredient-page__modal-backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.36);
}

.ingredient-page__modal {
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 40px));
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);
}

.ingredient-page__modal--info,
.ingredient-page__modal--dedupe {
  width: min(920px, 100%);
}

.ingredient-page__modal-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.ingredient-page__modal-header h2 {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.15rem;
}

.ingredient-page__modal-close {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1;
}

.ingredient-page__info {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
}

.ingredient-page__info-visual {
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-success) 18%, transparent), transparent 34%),
    linear-gradient(135deg, var(--color-surface-muted), color-mix(in srgb, var(--color-primary) 7%, var(--color-surface)));
  color: var(--color-text-tertiary);
  font-size: 4rem;
  font-weight: 800;
}

.ingredient-page__info-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.ingredient-page__info-main {
  display: grid;
  gap: 12px;
  align-content: start;
}

.ingredient-page__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.ingredient-page__chips span {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 9px;
}

.ingredient-page__alert {
  margin: 0;
  border-left: 3px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-danger);
  font-weight: 700;
  padding: 9px 10px;
}

.ingredient-page__modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.ingredient-page__info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 0 18px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.ingredient-page__info-tile {
  min-width: 0;
  display: grid;
  gap: 3px;
  align-content: start;
  padding: 12px;
  background: var(--color-surface);
}

.ingredient-page__info-tile span,
.ingredient-page__info-tile small {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ingredient-page__info-tile strong {
  overflow-wrap: anywhere;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  line-height: 1.3;
}

.ingredient-page__modal-form,
.ingredient-page__dedupe {
  margin: 0;
  padding: 16px 18px 18px;
}

.ingredient-page__modal-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ingredient-page__modal-form .ingredient-page__modal-actions {
  grid-column: 1 / -1;
  padding-top: 4px;
}

.ingredient-page__dedupe {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.ingredient-page__dedupe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: var(--color-surface);
}

.ingredient-page__dedupe-row div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.ingredient-page__dedupe-row strong {
  color: var(--color-text-primary);
}

.ingredient-page__dedupe-row span {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

@media (min-width: 640px) {
  .ingredient-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 860px) {
  .ingredient-page__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1120px) {
  .ingredient-page__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1320px) {
  .ingredient-page__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .ingredient-page {
    width: min(100% - 24px, 100%);
    padding-top: 14px;
  }

  .ingredient-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  :deep(.resource-search) {
    grid-template-columns: minmax(0, 1fr);
  }

  .ingredient-page__toolbar-actions,
  .ingredient-page__filter {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .ingredient-page__settings {
    width: 100%;
  }

  .ingredient-page__info {
    grid-template-columns: minmax(0, 1fr);
  }

  .ingredient-page__info-visual {
    max-height: 320px;
  }

  .ingredient-page__info-grid,
  .ingredient-page__modal-form,
  .ingredient-page__dedupe-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
