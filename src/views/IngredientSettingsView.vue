<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import SettingsNavigation from '@/components/settings/SettingsNavigation.vue'
import {
  useCreateIngredientGroup,
  useCreateIngredientRayon,
  useDeleteIngredientGroup,
  useDeleteIngredientRayon,
  useIngredientDuplicates,
  useIngredientGroups,
  useIngredientRayons,
  useMergeIngredientDuplicates,
  useRunIngredientEnrichmentBatch,
  useUpdateIngredientGroup,
  useUpdateIngredientRayon,
} from '@/composables/useCatalogQueries'
import { ingredientService } from '@/services/ingredientService'
import { shoppingService } from '@/services/shoppingService'
import type { PaginationInfo } from '@/types/api'
import type { DuplicateGroup, Ingredient, IngredientGroup, IngredientRayon } from '@/types/recipe'
import type { Supplier, SupplierType } from '@/types/shopping'

type Tab = 'groups' | 'rayons' | 'suppliers' | 'maintenance'

const activeTab = ref<Tab>('groups')
const editingUuid = ref<string | null>(null)
const deleteError = ref('')
const form = reactive({ name: '', description: '', sortOrder: '0' })
const supplierForm = reactive({ name: '', supplierType: 'store' as SupplierType, notes: '' })
const suppliers = ref<Supplier[]>([])
const supplierPagination = ref<PaginationInfo | null>(null)
const supplierPage = ref(1)
const supplierSentinel = ref<HTMLElement | null>(null)
const isLoadingSuppliers = ref(false)
const isFetchingMoreSuppliers = ref(false)
const isCreatingSupplier = ref(false)
const isUpdatingSupplier = ref(false)
const maintenanceMessage = ref('')
const incompleteIngredients = ref<Ingredient[]>([])
const isLoadingIncompleteIngredients = ref(false)
const duplicateTargets = reactive<Record<string, string>>({})

const { data: groups } = useIngredientGroups()
const { data: rayons } = useIngredientRayons()
const { mutate: createGroup, isPending: isCreatingGroup } = useCreateIngredientGroup()
const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateIngredientGroup()
const { mutate: deleteGroup, isPending: isDeletingGroup } = useDeleteIngredientGroup()
const { mutate: createRayon, isPending: isCreatingRayon } = useCreateIngredientRayon()
const { mutate: updateRayon, isPending: isUpdatingRayon } = useUpdateIngredientRayon()
const { mutate: deleteRayon, isPending: isDeletingRayon } = useDeleteIngredientRayon()
const { data: duplicateGroups, refetch: refetchDuplicates } = useIngredientDuplicates()
const { mutate: runEnrichmentBatch, isPending: isRunningEnrichmentBatch } = useRunIngredientEnrichmentBatch()
const { mutate: mergeDuplicates, isPending: isMerging } = useMergeIngredientDuplicates()

const rows = computed(() => (activeTab.value === 'groups' ? groups.value ?? [] : rayons.value ?? []))
const isBusy = computed(() => isCreatingGroup.value || isUpdatingGroup.value || isCreatingRayon.value || isUpdatingRayon.value)
const isDeleting = computed(() => isDeletingGroup.value || isDeletingRayon.value)
const hasMoreSuppliers = computed(() => supplierPagination.value?.has_next ?? false)
const isSavingSupplier = computed(() => isCreatingSupplier.value || isUpdatingSupplier.value)
const hasIncompleteIngredients = computed(() => incompleteIngredients.value.length > 0)
let supplierObserver: IntersectionObserver | null = null

const supplierTypeLabels: Record<SupplierType, string> = {
  store: 'Magasin',
  producer: 'Producteur',
  online: 'En ligne',
  other: 'Autre',
}

const resetForm = (): void => {
  form.name = ''
  form.description = ''
  form.sortOrder = '0'
  supplierForm.name = ''
  supplierForm.supplierType = 'store'
  supplierForm.notes = ''
  editingUuid.value = null
}

const selectTab = async (tab: Tab): Promise<void> => {
  activeTab.value = tab
  deleteError.value = ''
  resetForm()
  if (tab === 'suppliers' && suppliers.value.length === 0) {
    await loadSuppliers(true)
  }
  if (tab === 'maintenance') {
    await Promise.all([loadIncompleteIngredients(), refetchDuplicates()])
  }
  await nextTick()
  observeSupplierSentinel()
}

const isIngredientIncomplete = (ingredient: Ingredient): boolean =>
  ingredient.enrichment_profile.missing_fields.length > 0
  || ingredient.enrichment_profile.status === 'missing'
  || ingredient.enrichment_profile.status === 'partial'

const loadIncompleteIngredients = async (): Promise<void> => {
  isLoadingIncompleteIngredients.value = true
  maintenanceMessage.value = ''
  try {
    const result: Ingredient[] = []
    let page = 1
    const visitedPages = new Set<number>()
    while (!visitedPages.has(page)) {
      visitedPages.add(page)
      const response = await ingredientService.getPage({ page, per_page: 100 })
      result.push(...response.data.filter(isIngredientIncomplete))
      const nextPage = response.pagination.next_page
      if (!nextPage) break
      page = nextPage
    }
    incompleteIngredients.value = result
  } catch (err) {
    maintenanceMessage.value = err instanceof Error ? err.message : 'Chargement des ingrédients incomplets impossible.'
  } finally {
    isLoadingIncompleteIngredients.value = false
  }
}

const enrichIncompleteIngredients = (): void => {
  const ingredientUuids = incompleteIngredients.value.map((ingredient) => ingredient.uuid)
  if (!ingredientUuids.length) {
    maintenanceMessage.value = 'Aucun ingrédient incomplet à enrichir.'
    return
  }
  runEnrichmentBatch(
    { ingredientUuids, continueOnError: true },
    {
      onSuccess: (results) => {
        const failedCount = results.filter((result) => result.status === 'failed').length
        maintenanceMessage.value = `${results.length - failedCount} enrichissement(s) lancé(s), ${failedCount} échec(s).`
      },
      onError: (err) => {
        maintenanceMessage.value = err.message
      },
    },
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
        maintenanceMessage.value = `Fusion réalisée pour ${group.normalized_name}.`
        await refetchDuplicates()
      },
      onError: (err) => {
        maintenanceMessage.value = err.message
      },
    },
  )
}

const editRow = (row: IngredientGroup | IngredientRayon): void => {
  editingUuid.value = row.uuid
  form.name = row.name
  form.description = row.description ?? ''
  form.sortOrder = String(row.sort_order ?? 0)
}

const editSupplier = (supplier: Supplier): void => {
  editingUuid.value = supplier.uuid
  supplierForm.name = supplier.name
  supplierForm.supplierType = supplier.supplier_type
  supplierForm.notes = supplier.notes ?? ''
}

const submit = (): void => {
  if (activeTab.value === 'suppliers') {
    void submitSupplier()
    return
  }

  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    sort_order: Number(form.sortOrder) || 0,
  }
  if (!payload.name) return

  if (activeTab.value === 'groups') {
    if (editingUuid.value) updateGroup({ uuid: editingUuid.value, data: payload }, { onSuccess: resetForm })
    else createGroup(payload, { onSuccess: resetForm })
    return
  }

  if (editingUuid.value) updateRayon({ uuid: editingUuid.value, data: payload }, { onSuccess: resetForm })
  else createRayon(payload, { onSuccess: resetForm })
}

const removeRow = (row: IngredientGroup | IngredientRayon): void => {
  deleteError.value = ''
  const options = { onError: (err: Error) => { deleteError.value = err.message } }
  if (activeTab.value === 'groups') deleteGroup(row.uuid, options)
  else deleteRayon(row.uuid, options)
}

const loadSuppliers = async (reset = false): Promise<void> => {
  if (reset) {
    supplierPage.value = 1
    supplierPagination.value = null
    suppliers.value = []
  }
  isLoadingSuppliers.value = reset
  isFetchingMoreSuppliers.value = !reset
  try {
    const response = await shoppingService.listSuppliers({ page: supplierPage.value, per_page: 20 })
    suppliers.value = reset ? response.data : [...suppliers.value, ...response.data]
    supplierPagination.value = response.pagination
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Chargement fournisseurs impossible.'
  } finally {
    isLoadingSuppliers.value = false
    isFetchingMoreSuppliers.value = false
  }
}

const loadMoreSuppliers = async (): Promise<void> => {
  if (!hasMoreSuppliers.value || isFetchingMoreSuppliers.value) return
  supplierPage.value = supplierPagination.value?.next_page ?? supplierPage.value + 1
  await loadSuppliers()
}

const observeSupplierSentinel = (): void => {
  supplierObserver?.disconnect()
  supplierObserver = null
  if (activeTab.value !== 'suppliers' || !hasMoreSuppliers.value || !supplierSentinel.value) return
  supplierObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void loadMoreSuppliers()
    }
  }, { rootMargin: '160px' })
  supplierObserver.observe(supplierSentinel.value)
}

const submitSupplier = async (): Promise<void> => {
  const name = supplierForm.name.trim()
  if (!name) return
  deleteError.value = ''

  const payload = {
    name,
    supplier_type: supplierForm.supplierType,
    notes: supplierForm.notes.trim() || null,
  }

  if (editingUuid.value) {
    const supplier = suppliers.value.find((candidate) => candidate.uuid === editingUuid.value)
    if (!supplier) {
      deleteError.value = 'Fournisseur introuvable.'
      return
    }
    isUpdatingSupplier.value = true
    try {
      const updated = await shoppingService.updateSupplier(supplier.uuid, supplier.version, payload)
      suppliers.value = suppliers.value.map((candidate) => (candidate.uuid === updated.uuid ? updated : candidate))
      resetForm()
    } catch (err) {
      deleteError.value = err instanceof Error ? err.message : 'Modification fournisseur impossible.'
    } finally {
      isUpdatingSupplier.value = false
    }
    return
  }

  isCreatingSupplier.value = true
  try {
    await shoppingService.createSupplier(payload)
    resetForm()
    await loadSuppliers(true)
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Création fournisseur impossible.'
  } finally {
    isCreatingSupplier.value = false
  }
}

watch([hasMoreSuppliers, supplierSentinel], async () => {
  await nextTick()
  observeSupplierSentinel()
})

onBeforeUnmount(() => {
  supplierObserver?.disconnect()
})
</script>

<template>
  <main class="settings-view">
    <SettingsNavigation />

    <header class="settings-view__tabs">
      <button :class="{ 'settings-view__tab--active': activeTab === 'groups' }" @click="selectTab('groups')">Groupes</button>
      <button :class="{ 'settings-view__tab--active': activeTab === 'rayons' }" @click="selectTab('rayons')">Rayons</button>
      <button :class="{ 'settings-view__tab--active': activeTab === 'suppliers' }" @click="selectTab('suppliers')">Fournisseurs</button>
      <button :class="{ 'settings-view__tab--active': activeTab === 'maintenance' }" @click="selectTab('maintenance')">Maintenance</button>
    </header>

    <section v-if="activeTab === 'groups' || activeTab === 'rayons'" class="settings-view__editor">
      <AppInput id="setting-name" v-model="form.name" label="Nom" placeholder="Légumes" />
      <AppInput id="setting-description" v-model="form.description" label="Description" placeholder="Optionnel" />
      <AppInput id="setting-order" v-model="form.sortOrder" type="number" label="Ordre" placeholder="0" />
      <div class="settings-view__actions">
        <AppButton v-if="editingUuid" variant="secondary" @click="resetForm">Annuler</AppButton>
        <AppButton :disabled="!form.name.trim() || isBusy" @click="submit">{{ editingUuid ? 'Enregistrer' : 'Créer' }}</AppButton>
      </div>
    </section>

    <section v-else-if="activeTab === 'suppliers'" class="settings-view__editor">
      <AppInput id="supplier-name" v-model="supplierForm.name" label="Nom" placeholder="Biocoop" />
      <label class="settings-view__field">
        <span>Type</span>
        <select v-model="supplierForm.supplierType">
          <option value="store">Magasin</option>
          <option value="producer">Producteur</option>
          <option value="online">En ligne</option>
          <option value="other">Autre</option>
        </select>
      </label>
      <AppInput id="supplier-notes" v-model="supplierForm.notes" label="Notes" placeholder="Optionnel" />
      <div class="settings-view__actions">
        <AppButton v-if="editingUuid" variant="secondary" :disabled="isSavingSupplier" @click="resetForm">Annuler</AppButton>
        <AppButton :disabled="!supplierForm.name.trim() || isSavingSupplier" @click="submit">
          {{ editingUuid ? 'Enregistrer' : 'Créer' }}
        </AppButton>
      </div>
    </section>

    <p v-if="deleteError" class="settings-view__error">{{ deleteError }}</p>
    <p v-if="maintenanceMessage" class="settings-view__error settings-view__error--neutral">{{ maintenanceMessage }}</p>

    <section v-if="activeTab === 'groups' || activeTab === 'rayons'" class="settings-view__list">
      <article v-for="row in rows" :key="row.uuid" class="settings-view__row">
        <strong>{{ row.name }}</strong>
        <span>{{ row.slug }}</span>
        <span>{{ row.description || '—' }}</span>
        <span>{{ row.sort_order }}</span>
        <div class="settings-view__actions">
          <AppButton variant="secondary" @click="editRow(row)">Modifier</AppButton>
          <AppButton variant="danger" :disabled="isDeleting" @click="removeRow(row)">Supprimer</AppButton>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'suppliers'" class="settings-view__list">
      <p v-if="isLoadingSuppliers" class="settings-view__state">Chargement…</p>
      <p v-else-if="!suppliers.length" class="settings-view__state">Aucun fournisseur.</p>
      <template v-else>
        <article v-for="supplier in suppliers" :key="supplier.uuid" class="settings-view__row settings-view__row--supplier">
          <strong>{{ supplier.name }}</strong>
          <span>{{ supplierTypeLabels[supplier.supplier_type] }}</span>
          <span>{{ supplier.notes || '—' }}</span>
          <div class="settings-view__actions">
            <AppButton variant="secondary" :disabled="isSavingSupplier" @click="editSupplier(supplier)">Modifier</AppButton>
          </div>
        </article>
      </template>
      <div v-if="hasMoreSuppliers" ref="supplierSentinel" class="settings-view__footer">
        <AppButton variant="secondary" :disabled="isFetchingMoreSuppliers" @click="loadMoreSuppliers">
          {{ isFetchingMoreSuppliers ? 'Chargement…' : 'Charger plus' }}
        </AppButton>
      </div>
    </section>

    <section v-else class="settings-view__maintenance">
      <article class="settings-view__maintenance-card">
        <div>
          <h2>Enrichissement ingrédients</h2>
          <p>
            {{ isLoadingIncompleteIngredients ? 'Analyse du catalogue...' : `${incompleteIngredients.length} fiche(s) incomplète(s)` }}
          </p>
        </div>
        <div class="settings-view__actions">
          <AppButton variant="secondary" :disabled="isLoadingIncompleteIngredients" @click="loadIncompleteIngredients">
            Actualiser
          </AppButton>
          <AppButton
            :disabled="isLoadingIncompleteIngredients || isRunningEnrichmentBatch || !hasIncompleteIngredients"
            @click="enrichIncompleteIngredients"
          >
            {{ isRunningEnrichmentBatch ? 'Enrichissement…' : 'Enrichir les manquants' }}
          </AppButton>
        </div>
      </article>

      <article class="settings-view__maintenance-card">
        <div>
          <h2>Fusion des doublons</h2>
          <p>{{ duplicateGroups?.length ?? 0 }} groupe(s) détecté(s)</p>
        </div>
        <div v-if="duplicateGroups?.length" class="settings-view__dedupe">
          <div v-for="group in duplicateGroups" :key="group.normalized_name" class="settings-view__dedupe-row">
            <strong>{{ group.normalized_name }}</strong>
            <select v-model="duplicateTargets[group.normalized_name]">
              <option v-for="item in group.items" :key="item.uuid" :value="item.uuid">{{ item.name }}</option>
            </select>
            <AppButton variant="secondary" :disabled="isMerging" @click="mergeDuplicateGroup(group)">Fusionner</AppButton>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.settings-view {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 24px 56px;
}

.settings-view__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.settings-view__tabs button {
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font: inherit;
  font-weight: 650;
}

.settings-view__tab--active {
  color: var(--color-text-primary) !important;
  background: var(--color-secondary-dark) !important;
}

.settings-view__editor,
.settings-view__row {
  display: grid;
  gap: 8px;
}

.settings-view__editor {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  align-items: end;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  margin-bottom: 12px;
}

.settings-view__field {
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.settings-view__field select {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

.settings-view__list {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-border);
}

.settings-view__row {
  grid-template-columns: minmax(0, 1fr) 160px minmax(0, 1fr) 80px auto;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.settings-view__row--supplier {
  grid-template-columns: minmax(0, 1fr) 160px minmax(0, 1.4fr) auto;
}

.settings-view__row strong {
  color: var(--color-text-primary);
}

.settings-view__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.settings-view__error,
.settings-view__state,
.settings-view__footer {
  margin: 0;
  padding: 14px;
  background: var(--color-surface);
}

.settings-view__error {
  margin-bottom: 12px;
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-weight: 650;
}

.settings-view__error--neutral {
  color: var(--color-text-secondary);
}

.settings-view__state {
  color: var(--color-text-secondary);
}

.settings-view__footer {
  display: flex;
  justify-content: center;
}

.settings-view__maintenance {
  display: grid;
  gap: 12px;
}

.settings-view__maintenance-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.settings-view__maintenance-card h2,
.settings-view__maintenance-card p {
  margin: 0;
}

.settings-view__maintenance-card h2 {
  color: var(--color-text-primary);
  font-size: 1rem;
}

.settings-view__maintenance-card p {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 650;
}

.settings-view__dedupe {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.settings-view__dedupe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: var(--color-surface);
}

.settings-view__dedupe-row select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

@media (max-width: 900px) {
  .settings-view__row,
  .settings-view__row--supplier,
  .settings-view__dedupe-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
