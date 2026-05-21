<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import EquipmentCard from '@/components/equipment/EquipmentCard.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import {
  useCreateEquipment,
  useDeleteEquipment,
  useEquipmentDuplicates,
  useMergeEquipmentDuplicates,
  useUpdateEquipment,
} from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { equipmentService } from '@/services/equipmentService'
import type { PaginationInfo } from '@/types/api'
import type { DuplicateGroup, Equipment } from '@/types/recipe'

const PER_PAGE = 72
const router = useRouter()
const navigation = useListNavigation('equipment')
const searchTerm = ref(navigation.state.search)
const equipmentItems = ref<Equipment[]>([])
const pagination = ref<PaginationInfo | null>(null)
const currentPage = ref(navigation.state.page || 1)
const isLoading = ref(false)
const isFetchingMore = ref(false)
const loadError = ref('')
const editingUuid = ref<string | null>(null)
const selectedEquipment = ref<Equipment | null>(null)
const isFormModalOpen = ref(false)
const isDedupeModalOpen = ref(false)
const deleteError = ref('')
const duplicateTargets = reactive<Record<string, string>>({})
const form = reactive({ name: '', description: '' })

const { data: duplicateGroups, refetch: refetchDuplicates } = useEquipmentDuplicates()
const { mutate: createEquipment, isPending: isCreating } = useCreateEquipment()
const { mutate: updateEquipment, isPending: isUpdating } = useUpdateEquipment()
const { mutate: deleteEquipment, isPending: isDeleting } = useDeleteEquipment()
const { mutate: mergeDuplicates, isPending: isMerging } = useMergeEquipmentDuplicates()

const total = computed(() => pagination.value?.total ?? equipmentItems.value.length)
const hasNext = computed(() => pagination.value?.has_next ?? false)
const isEmpty = computed(() => !isLoading.value && equipmentItems.value.length === 0)
const formModalTitle = computed(() => editingUuid.value ? 'Modifier un équipement' : 'Créer un équipement')
const resultSummary = computed(() => {
  const totalText = total.value > equipmentItems.value.length ? `sur ${total.value}` : ''
  return `${equipmentItems.value.length} affiché${equipmentItems.value.length > 1 ? 's' : ''} ${totalText}`.trim()
})

const equipmentInitial = (equipment: Equipment): string =>
  equipment.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'E'

const fetchPage = async (page: number, append: boolean): Promise<void> => {
  const response = await equipmentService.getPage({
    name: searchTerm.value.trim() || undefined,
    page,
    per_page: PER_PAGE,
  })
  pagination.value = response.pagination
  currentPage.value = response.pagination.page
  equipmentItems.value = append ? [...equipmentItems.value, ...response.data] : response.data
}

const syncSelectedEquipment = (): void => {
  if (!selectedEquipment.value) return
  selectedEquipment.value = equipmentItems.value.find((equipment) => equipment.uuid === selectedEquipment.value?.uuid) ?? null
}

const reload = async (pageCount = 1): Promise<void> => {
  isLoading.value = true
  loadError.value = ''
  equipmentItems.value = []
  try {
    for (let page = 1; page <= pageCount; page += 1) {
      await fetchPage(page, page > 1)
    }
    syncSelectedEquipment()
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
  form.description = ''
  editingUuid.value = null
}

const openCreateModal = (): void => {
  resetForm()
  selectedEquipment.value = null
  isFormModalOpen.value = true
}

const editEquipment = (equipment: Equipment): void => {
  editingUuid.value = equipment.uuid
  form.name = equipment.name
  form.description = equipment.description ?? ''
  isFormModalOpen.value = true
}

const editEquipmentFromInfo = (equipment: Equipment): void => {
  selectedEquipment.value = null
  editEquipment(equipment)
}

const closeFormModal = (): void => {
  isFormModalOpen.value = false
  resetForm()
}

const submit = (): void => {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
  }
  if (!payload.name) return

  const onSuccess = async (): Promise<void> => {
    const selectedUuid = editingUuid.value
    closeFormModal()
    await reload(currentPage.value)
    if (selectedUuid) {
      selectedEquipment.value = equipmentItems.value.find((equipment) => equipment.uuid === selectedUuid) ?? null
    }
    await refetchDuplicates()
  }

  if (editingUuid.value) {
    updateEquipment({ uuid: editingUuid.value, data: payload }, { onSuccess })
    return
  }
  createEquipment(payload, { onSuccess })
}

const removeEquipment = (equipment: Equipment): void => {
  if (!window.confirm(`Supprimer ${equipment.name} ?`)) return
  deleteError.value = ''
  deleteEquipment(equipment.uuid, {
    onSuccess: async () => {
      selectedEquipment.value = null
      await reload(currentPage.value)
      await refetchDuplicates()
    },
    onError: (err) => {
      deleteError.value = err.message
    },
  })
}

const openEquipment = (equipment: Equipment): void => {
  selectedEquipment.value = equipment
  navigation.save({ search: searchTerm.value, page: currentPage.value, selectedUuid: equipment.uuid })
}

const openFullEquipment = (equipment: Equipment): void => {
  navigation.navigateToDetail(
    router,
    { name: 'equipment-detail', params: { id: equipment.uuid } },
    { search: searchTerm.value, page: currentPage.value, selectedUuid: equipment.uuid },
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
  selectedEquipment.value = null
  await reload(1)
})

onMounted(async () => {
  await reload(navigation.state.page || 1)
  await navigation.restoreScroll()
})
</script>

<template>
  <main class="equipment-page">
    <header class="equipment-page__header">
      <div>
        <p>Catalogue</p>
        <h1>Mes équipements</h1>
        <span>{{ resultSummary }}</span>
      </div>
      <AppButton @click="openCreateModal">Nouvel équipement</AppButton>
    </header>

    <p v-if="deleteError" class="equipment-page__error">{{ deleteError }}</p>

    <section class="equipment-page__toolbar" aria-label="Filtres équipements">
      <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher un équipement">
        <div class="equipment-page__toolbar-actions">
          <AppButton
            variant="secondary"
            :disabled="!duplicateGroups?.length"
            @click="isDedupeModalOpen = true"
          >
            Fusion
          </AppButton>
        </div>
      </ResourceSearchBar>
    </section>

    <section class="equipment-page__content" aria-live="polite">
      <p v-if="isLoading" class="equipment-page__state">Chargement…</p>
      <p v-else-if="loadError" class="equipment-page__state equipment-page__state--error">{{ loadError }}</p>
      <p v-else-if="isEmpty" class="equipment-page__state">Aucun équipement.</p>
      <div v-else class="equipment-page__grid">
        <EquipmentCard
          v-for="equipment in equipmentItems"
          :key="equipment.uuid"
          :name="equipment.name"
          @click="openEquipment(equipment)"
        />
      </div>

      <footer v-if="hasNext && total > equipmentItems.length" class="equipment-page__footer">
        <AppButton variant="secondary" :disabled="isFetchingMore" @click="loadMore">
          {{ isFetchingMore ? 'Chargement…' : `Charger ${Math.min(PER_PAGE, total - equipmentItems.length)} équipements` }}
        </AppButton>
        <AppButton variant="secondary" :disabled="isFetchingMore" @click="loadRemaining">
          Charger les {{ total - equipmentItems.length }} restants
        </AppButton>
      </footer>
    </section>

    <div v-if="selectedEquipment" class="equipment-page__modal-backdrop" @click.self="selectedEquipment = null">
      <section class="equipment-page__modal equipment-page__modal--info" role="dialog" aria-modal="true" :aria-label="`Fiche ${selectedEquipment.name}`">
        <header class="equipment-page__modal-header">
          <h2>{{ selectedEquipment.name }}</h2>
          <button type="button" class="equipment-page__modal-close" aria-label="Fermer" @click="selectedEquipment = null">×</button>
        </header>

        <div class="equipment-page__info">
          <div class="equipment-page__info-visual" aria-hidden="true">
            <span>{{ equipmentInitial(selectedEquipment) }}</span>
          </div>

          <div class="equipment-page__info-main">
            <p>{{ selectedEquipment.description || 'Aucune description renseignée.' }}</p>

            <div class="equipment-page__modal-actions">
              <AppButton variant="secondary" @click="editEquipmentFromInfo(selectedEquipment)">Modifier</AppButton>
              <AppButton variant="secondary" @click="openFullEquipment(selectedEquipment)">Fiche complète</AppButton>
              <AppButton variant="danger" :disabled="isDeleting" @click="removeEquipment(selectedEquipment)">Supprimer</AppButton>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="isFormModalOpen" class="equipment-page__modal-backdrop" @click.self="closeFormModal">
      <section class="equipment-page__modal" role="dialog" aria-modal="true" :aria-label="formModalTitle">
        <header class="equipment-page__modal-header">
          <h2>{{ formModalTitle }}</h2>
          <button type="button" class="equipment-page__modal-close" aria-label="Fermer" @click="closeFormModal">×</button>
        </header>
        <form class="equipment-page__modal-form" @submit.prevent="submit">
          <AppInput id="equipment-name" v-model="form.name" label="Nom" placeholder="Four" required />
          <AppInput id="equipment-description" v-model="form.description" label="Description" placeholder="Optionnel" />
          <div class="equipment-page__modal-actions">
            <AppButton type="button" variant="secondary" @click="closeFormModal">Annuler</AppButton>
            <AppButton type="submit" :disabled="!form.name.trim() || isCreating || isUpdating">
              {{ editingUuid ? 'Enregistrer' : 'Créer' }}
            </AppButton>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isDedupeModalOpen" class="equipment-page__modal-backdrop" @click.self="isDedupeModalOpen = false">
      <section class="equipment-page__modal equipment-page__modal--dedupe" role="dialog" aria-modal="true" aria-label="Fusion des doublons">
        <header class="equipment-page__modal-header">
          <h2>Fusion des doublons</h2>
          <button type="button" class="equipment-page__modal-close" aria-label="Fermer" @click="isDedupeModalOpen = false">×</button>
        </header>
        <div v-if="duplicateGroups?.length" class="equipment-page__dedupe">
          <article v-for="group in duplicateGroups" :key="group.normalized_name" class="equipment-page__dedupe-row">
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
        <p v-else class="equipment-page__notice equipment-page__notice--modal">Aucun doublon détecté.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.equipment-page {
  width: min(1440px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 18px 0 48px;
}

.equipment-page__header {
  display: flex;
  gap: 16px;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 14px;
}

.equipment-page__header div {
  min-width: 0;
}

.equipment-page__header p,
.equipment-page__header span {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  font-weight: 650;
}

.equipment-page__header h1 {
  margin: 3px 0 3px;
  color: var(--color-text-primary);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  letter-spacing: 0;
  line-height: 1.05;
}

.equipment-page__toolbar {
  margin-bottom: 14px;
}

.equipment-page__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.equipment-page__content {
  display: grid;
  gap: 14px;
}

.equipment-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.equipment-page__state {
  margin: 0;
  padding: 18px 0;
  color: var(--color-text-secondary);
  font-weight: 650;
}

.equipment-page__state--error,
.equipment-page__error {
  color: var(--color-danger);
}

.equipment-page__error,
.equipment-page__notice {
  margin: 0 0 10px;
  font-weight: 650;
}

.equipment-page__notice {
  color: var(--color-text-secondary);
}

.equipment-page__notice--modal {
  padding: 16px 18px 18px;
}

.equipment-page__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.equipment-page__modal-backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.36);
}

.equipment-page__modal {
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 40px));
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.22);
}

.equipment-page__modal--info,
.equipment-page__modal--dedupe {
  width: min(920px, 100%);
}

.equipment-page__modal-header {
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

.equipment-page__modal-header h2 {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.15rem;
}

.equipment-page__modal-close {
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

.equipment-page__info {
  display: grid;
  grid-template-columns: minmax(160px, 240px) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
}

.equipment-page__info-visual {
  aspect-ratio: 1;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 34%),
    linear-gradient(135deg, var(--color-surface-muted), color-mix(in srgb, var(--color-secondary) 70%, var(--color-surface)));
  color: var(--color-text-tertiary);
  font-size: clamp(3rem, 7vw, 5rem);
  font-weight: 800;
}

.equipment-page__info-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
  justify-content: space-between;
}

.equipment-page__info-main p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.equipment-page__modal-form {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.equipment-page__modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.equipment-page__dedupe {
  display: grid;
  gap: 1px;
  overflow: hidden;
  background: var(--color-border);
}

.equipment-page__dedupe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 18px;
  background: var(--color-surface);
}

.equipment-page__dedupe-row div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.equipment-page__dedupe-row strong {
  overflow: hidden;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-page__dedupe-row span {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.equipment-page__dedupe select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

@media (min-width: 640px) {
  .equipment-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 860px) {
  .equipment-page__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1120px) {
  .equipment-page__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1320px) {
  .equipment-page__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .equipment-page {
    width: min(100% - 24px, 100%);
    padding-top: 14px;
  }

  .equipment-page__header,
  .equipment-page__info {
    grid-template-columns: minmax(0, 1fr);
  }

  .equipment-page__header {
    align-items: start;
    flex-direction: column;
  }

  .equipment-page__toolbar :deep(.resource-search) {
    grid-template-columns: minmax(0, 1fr);
  }

  .equipment-page__toolbar-actions,
  .equipment-page__modal-actions {
    justify-content: stretch;
  }

  .equipment-page__toolbar-actions > *,
  .equipment-page__modal-actions > * {
    flex: 1;
  }

  .equipment-page__dedupe-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
