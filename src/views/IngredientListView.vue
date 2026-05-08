<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import ResourceList from '@/components/resources/ResourceList.vue'
import ResourceRow from '@/components/resources/ResourceRow.vue'
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
import type { DuplicateGroup, Ingredient } from '@/types/recipe'
import type { PaginationInfo } from '@/types/api'
import type { Supplier } from '@/types/shopping'

const PER_PAGE = 50
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

const total = computed(() => pagination.value?.total ?? ingredients.value.length)
const hasNext = computed(() => pagination.value?.has_next ?? false)
const filteredIngredients = computed(() => ingredients.value.filter(matchesQualityFilter))
const visibleIncompleteIngredients = computed(() => filteredIngredients.value.filter(isIngredientIncomplete))
const isEmpty = computed(() => !isLoading.value && filteredIngredients.value.length === 0)
const formModalTitle = computed(() => editingUuid.value ? 'Modifier un ingrédient' : 'Créer un ingrédient')
const supplierByUuid = computed(() => new Map(suppliers.value.map((supplier) => [supplier.uuid, supplier.name] as const)))
const secondarySuppliers = computed(() => suppliers.value.filter((supplier) => supplier.uuid !== form.mainSupplierUuid))
const currentMonth = new Date().getMonth() + 1

const supplierName = (uuid: string | null | undefined): string => {
  if (!uuid) return '—'
  return supplierByUuid.value.get(uuid) ?? 'Fournisseur inconnu'
}

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

const scoreLabel = (ingredient: Ingredient): string => `${ingredient.enrichment_profile.completeness_score} %`

const seasonLabel = (ingredient: Ingredient): string => {
  if (ingredient.seasonality_profile.availability_type === 'year_round') return 'Saison'
  if (Number(ingredient.seasonality_profile.months[currentMonth] ?? 0) > 0) return 'Saison'
  if (ingredient.seasonality_profile.availability_type === 'unknown') return 'Saison ?'
  return 'Hors saison'
}

const nutritionLabel = (ingredient: Ingredient): string => {
  if (ingredient.nutrition_profile.nutri_score !== 'unknown') return `Nutri ${ingredient.nutrition_profile.nutri_score}`
  if (ingredient.nutrition_profile.kcal_per_100g !== null) return `${ingredient.nutrition_profile.kcal_per_100g} kcal`
  return 'Nutri ?'
}

const carbonLabel = (ingredient: Ingredient): string =>
  ingredient.sustainability_profile.carbon_kg_co2e_per_kg === null
    ? 'CO2 ?'
    : `${ingredient.sustainability_profile.carbon_kg_co2e_per_kg} CO2e`

const allergenLabel = (ingredient: Ingredient): string => {
  const count = ingredient.allergen_profile.allergens.filter((allergen) =>
    ['contains', 'may_contain'].includes(allergen.presence),
  ).length
  return count ? `${count} allergène${count > 1 ? 's' : ''}` : 'Allergènes ?'
}

const aiLabel = (ingredient: Ingredient): string =>
  ingredient.enrichment_profile.status === 'suggested' ? 'IA à valider' : ingredient.enrichment_profile.status

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

const reload = async (pageCount = 1): Promise<void> => {
  isLoading.value = true
  loadError.value = ''
  ingredients.value = []
  try {
    for (let page = 1; page <= pageCount; page += 1) {
      await fetchPage(page, page > 1)
    }
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
    closeFormModal()
    await reload(currentPage.value)
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
  deleteError.value = ''
  deleteIngredient(ingredient.uuid, {
    onSuccess: async () => {
      await reload(currentPage.value)
      await refetchDuplicates()
    },
    onError: (err) => {
      deleteError.value = err.message
    },
  })
}

const openIngredient = (ingredient: Ingredient): void => {
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
  <main class="resource-page">
    <p v-if="deleteError" class="resource-page__error">{{ deleteError }}</p>
    <p v-if="enrichmentMessage" class="resource-page__notice">{{ enrichmentMessage }}</p>

    <ResourceList
      :is-loading="isLoading"
      :is-error="!!loadError"
      :error-message="loadError"
      :is-empty="isEmpty"
      :loaded-count="ingredients.length"
      :total="total"
      :per-page="PER_PAGE"
      :has-next="hasNext"
      :is-fetching-more="isFetchingMore"
      @load-more="loadMore"
      @load-remaining="loadRemaining"
    >
      <template #toolbar>
        <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher un ingrédient">
          <div class="resource-page__toolbar-actions">
            <AppButton @click="openCreateModal">Nouvel ingrédient</AppButton>
            <label class="resource-page__filter">
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
            <router-link :to="{ name: 'ingredient-settings' }" class="resource-page__settings" title="Réglages ingrédients">
              ⚙
            </router-link>
          </div>
        </ResourceSearchBar>
      </template>

      <ResourceRow
        v-for="ingredient in filteredIngredients"
        :key="ingredient.uuid"
        columns="minmax(0, 1.3fr) minmax(150px, 1fr) minmax(110px, 0.7fr) minmax(110px, 0.7fr) minmax(130px, 0.8fr) 70px minmax(116px, auto)"
        @click="openIngredient(ingredient)"
      >
        <div class="resource-page__identity">
          <strong class="resource-page__primary">{{ ingredient.name }}</strong>
          <span class="resource-page__badges">
            <span>{{ scoreLabel(ingredient) }}</span>
            <span>{{ seasonLabel(ingredient) }}</span>
            <span>{{ aiLabel(ingredient) }}</span>
          </span>
        </div>
        <span class="resource-page__quality">
          <span>{{ nutritionLabel(ingredient) }}</span>
          <span>{{ carbonLabel(ingredient) }}</span>
          <span>{{ allergenLabel(ingredient) }}</span>
        </span>
        <span>{{ ingredient.group?.name || '—' }}</span>
        <span>{{ ingredient.rayon?.name || '—' }}</span>
        <span>{{ supplierName(ingredient.main_supplier_uuid) }}</span>
        <span>{{ ingredient.unit || '—' }}</span>
        <span class="resource-page__row-actions">
          <IconActionButton
            label="Enrichir avec IA"
            icon="IA"
            :disabled="isRunningIngredientEnrichment && activeEnrichmentUuid === ingredient.uuid"
            @click="enrichIngredient(ingredient)"
          />
          <IconActionButton label="Modifier" icon="✎" @click="editIngredient(ingredient)" />
          <IconActionButton label="Supprimer" icon="×" variant="danger" :disabled="isDeleting" @click="removeIngredient(ingredient)" />
        </span>
      </ResourceRow>
    </ResourceList>

    <div v-if="isFormModalOpen" class="resource-page__modal-backdrop" @click.self="closeFormModal">
      <section class="resource-page__modal" role="dialog" aria-modal="true" :aria-label="formModalTitle">
        <header class="resource-page__modal-header">
          <h2>{{ formModalTitle }}</h2>
          <button type="button" class="resource-page__modal-close" aria-label="Fermer" @click="closeFormModal">×</button>
        </header>
        <form class="resource-page__modal-form" @submit.prevent="submit">
          <AppInput id="ingredient-name" v-model="form.name" label="Nom" placeholder="Tomate" required />
          <AppInput id="ingredient-unit" v-model="form.unit" label="Unité" placeholder="g" />
          <label class="resource-page__field">
            <span>Groupe</span>
            <select v-model="form.groupUuid">
              <option value="">Aucun</option>
              <option v-for="group in groups ?? []" :key="group.uuid" :value="group.uuid">{{ group.name }}</option>
            </select>
          </label>
          <label class="resource-page__field">
            <span>Rayon</span>
            <select v-model="form.rayonUuid">
              <option value="">Aucun</option>
              <option v-for="rayon in rayons ?? []" :key="rayon.uuid" :value="rayon.uuid">{{ rayon.name }}</option>
            </select>
          </label>
          <label class="resource-page__field">
            <span>Fournisseur principal</span>
            <select v-model="form.mainSupplierUuid">
              <option value="">Aucun</option>
              <option v-for="supplier in suppliers" :key="supplier.uuid" :value="supplier.uuid">{{ supplier.name }}</option>
            </select>
          </label>
          <label class="resource-page__field">
            <span>Fournisseurs secondaires</span>
            <select v-model="form.secondarySupplierUuids" multiple>
              <option v-for="supplier in secondarySuppliers" :key="supplier.uuid" :value="supplier.uuid">{{ supplier.name }}</option>
            </select>
          </label>
          <div class="resource-page__modal-actions">
            <AppButton type="button" variant="secondary" @click="closeFormModal">Annuler</AppButton>
            <AppButton type="submit" :disabled="!form.name.trim() || isCreating || isUpdating">
              {{ editingUuid ? 'Enregistrer' : 'Créer' }}
            </AppButton>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isDedupeModalOpen" class="resource-page__modal-backdrop" @click.self="isDedupeModalOpen = false">
      <section class="resource-page__modal resource-page__modal--dedupe" role="dialog" aria-modal="true" aria-label="Fusion des doublons">
        <header class="resource-page__modal-header">
          <h2>Fusion des doublons</h2>
          <button type="button" class="resource-page__modal-close" aria-label="Fermer" @click="isDedupeModalOpen = false">×</button>
        </header>
        <div v-if="duplicateGroups?.length" class="resource-page__dedupe">
          <article v-for="group in duplicateGroups" :key="group.normalized_name" class="resource-page__dedupe-row">
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
        <p v-else class="resource-page__notice">Aucun doublon détecté.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.resource-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 20px 48px;
}

.resource-page__field {
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.resource-page__field select,
.resource-page__filter select,
.resource-page__dedupe select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

.resource-page__field select[multiple] {
  min-height: 84px;
}

.resource-page__actions,
.resource-page__row-actions,
.resource-page__modal-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.resource-page__toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.resource-page__filter {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.resource-page__settings {
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

.resource-page__identity {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.resource-page__primary {
  overflow: hidden;
  color: var(--color-text-primary);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-page__badges,
.resource-page__quality {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.resource-page__badges span,
.resource-page__quality span {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  padding: 2px 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
  white-space: nowrap;
}

.resource-page__error {
  margin: 0 0 10px;
  color: var(--color-danger);
  font-weight: 650;
}

.resource-page__notice {
  margin: 0 0 10px;
  color: var(--color-text-secondary);
  font-weight: 650;
}

.resource-page__dedupe {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.resource-page__dedupe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: var(--color-surface);
}

.resource-page__dedupe-row div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.resource-page__dedupe-row strong {
  color: var(--color-text-primary);
}

.resource-page__dedupe-row span {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.resource-page__modal-backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.36);
}

.resource-page__modal {
  width: min(760px, 100%);
  max-height: min(720px, calc(100vh - 40px));
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);
}

.resource-page__modal--dedupe {
  width: min(880px, 100%);
}

.resource-page__modal-header {
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

.resource-page__modal-header h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.12rem;
}

.resource-page__modal-close {
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

.resource-page__modal-form,
.resource-page__modal .resource-page__dedupe,
.resource-page__modal > .resource-page__notice {
  margin: 0;
  padding: 16px 18px 18px;
}

.resource-page__modal-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.resource-page__modal-actions {
  grid-column: 1 / -1;
  padding-top: 4px;
}

@media (max-width: 860px) {
  :deep(.resource-search) {
    grid-template-columns: minmax(0, 1fr);
  }

  .resource-page__dedupe-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .resource-page__toolbar-actions,
  .resource-page__filter {
    width: 100%;
  }

  .resource-page__toolbar-actions,
  .resource-page__filter {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .resource-page__modal-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
