<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import CreateAction from '@/components/atoms/CreateAction.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import AppToast from '@/components/atoms/AppToast.vue'
import EquipmentCard from '@/components/equipment/EquipmentCard.vue'
import EquipmentLayer from '@/components/equipment/EquipmentLayer.vue'
import RecipeLayer from '@/components/organisms/RecipeLayer.vue'
import ResourceLayerDock from '@/components/resources/ResourceLayerDock.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import {
  useCreateEquipment,
  useDeleteEquipment,
  useGenerateEquipmentImage,
  useUpdateEquipment,
} from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { equipmentService } from '@/services/equipmentService'
import type { PaginationInfo } from '@/types/api'
import type { Equipment, Recipe } from '@/types/recipe'
import {
  removeEntityByUuid,
  replaceEntityByUuid,
  upsertEntityByUuid,
} from '@/utils/entityCollections'
import {
  closeResourceLayer,
  createResourceLayersState,
  minimizeResourceLayer,
  openResourceLayer,
  renameResourceLayer,
  restoreResourceLayer,
  type ResourceLayersState,
} from '@/utils/resourceLayers'

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
const deleteError = ref('')
const imageGenerationMessage = ref('')
const imageGenerationTone = ref<'success' | 'error'>('success')
const form = reactive({ name: '', description: '' })
const layers = ref<ResourceLayersState>(createResourceLayersState())
const equipmentLayers = computed(() => layers.value.sessions.filter((session) => session.kind === 'equipment'))
const recipeLayers = computed(() => layers.value.sessions.filter((session) => session.kind === 'recipe'))

const { mutate: createEquipment, isPending: isCreating } = useCreateEquipment()
const { mutate: updateEquipment, isPending: isUpdating } = useUpdateEquipment()
const { mutate: deleteEquipment, isPending: isDeleting } = useDeleteEquipment()
const { mutate: generateEquipmentImage, isPending: isGeneratingEquipmentImage } = useGenerateEquipmentImage()

const total = computed(() => pagination.value?.total ?? equipmentItems.value.length)
const hasNext = computed(() => pagination.value?.has_next ?? false)
const isEmpty = computed(() => !isLoading.value && equipmentItems.value.length === 0)
const formModalTitle = computed(() => editingUuid.value ? 'Modifier un équipement' : 'Créer un équipement')
const equipmentInitial = (equipment: Equipment): string =>
  equipment.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || 'E'

const matchesCurrentSearch = (equipment: Equipment): boolean => {
  const term = searchTerm.value.trim().toLocaleLowerCase('fr-FR')
  return !term || equipment.name.toLocaleLowerCase('fr-FR').includes(term)
}

const syncEquipmentInList = (equipment: Equipment, allowInsert = false): void => {
  const isAlreadyVisible = equipmentItems.value.some((item) => item.uuid === equipment.uuid)

  if (!matchesCurrentSearch(equipment)) {
    equipmentItems.value = removeEntityByUuid(equipmentItems.value, equipment.uuid)
  } else if (isAlreadyVisible) {
    equipmentItems.value = replaceEntityByUuid(equipmentItems.value, equipment)
  } else if (allowInsert) {
    equipmentItems.value = upsertEntityByUuid(equipmentItems.value, equipment)
  }

  if (selectedEquipment.value?.uuid === equipment.uuid) {
    selectedEquipment.value = equipment
  }
}

const adjustTotal = (delta: number): void => {
  if (!pagination.value) return
  pagination.value = {
    ...pagination.value,
    total: Math.max(0, pagination.value.total + delta),
  }
}

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

  if (editingUuid.value) {
    const selectedUuid = editingUuid.value
    updateEquipment(
      { uuid: selectedUuid, data: payload },
      {
        onSuccess: (updatedEquipment) => {
          closeFormModal()
          syncEquipmentInList(updatedEquipment)
          selectedEquipment.value = matchesCurrentSearch(updatedEquipment) ? updatedEquipment : null
        },
      },
    )
    return
  }
  createEquipment(payload, {
    onSuccess: (createdEquipment) => {
      closeFormModal()
      syncEquipmentInList(createdEquipment, true)
      if (matchesCurrentSearch(createdEquipment)) adjustTotal(1)
    },
  })
}

const removeEquipment = (equipment: Equipment): void => {
  if (!window.confirm(`Supprimer ${equipment.name} ?`)) return
  deleteError.value = ''
  deleteEquipment(equipment.uuid, {
    onSuccess: async () => {
      selectedEquipment.value = null
      const wasVisible = equipmentItems.value.some((item) => item.uuid === equipment.uuid)
      equipmentItems.value = removeEntityByUuid(equipmentItems.value, equipment.uuid)
      if (wasVisible) adjustTotal(-1)
    },
    onError: (err) => {
      deleteError.value = err.message
    },
  })
}

const openEquipment = (equipment: Equipment): void => {
  imageGenerationMessage.value = ''
  layers.value = openResourceLayer(layers.value, {
    kind: 'equipment',
    uuid: equipment.uuid,
    name: equipment.name,
  })
  navigation.save({ search: searchTerm.value, page: currentPage.value, selectedUuid: equipment.uuid })
}

const openRecipe = (recipe: Recipe): void => {
  layers.value = openResourceLayer(layers.value, {
    kind: 'recipe',
    uuid: recipe.uuid,
    name: recipe.name,
  })
}

const restoreLayer = (key: string): void => {
  layers.value = restoreResourceLayer(layers.value, key)
}

const minimizeLayer = (key: string): void => {
  layers.value = minimizeResourceLayer(layers.value, key)
}

const closeLayer = (key: string): void => {
  layers.value = closeResourceLayer(layers.value, key)
}

const renameLayer = (key: string, title: string): void => {
  layers.value = renameResourceLayer(layers.value, key, title)
}

const handleLayerDeleted = (equipmentUuid: string): void => {
  const wasVisible = equipmentItems.value.some((item) => item.uuid === equipmentUuid)
  equipmentItems.value = removeEntityByUuid(equipmentItems.value, equipmentUuid)
  if (wasVisible) adjustTotal(-1)
}

const openFullEquipment = (equipment: Equipment): void => {
  navigation.navigateToDetail(
    router,
    { name: 'equipment-detail', params: { id: equipment.uuid } },
    { search: searchTerm.value, page: currentPage.value, selectedUuid: equipment.uuid },
  )
}

const generateImageForEquipment = (equipment: Equipment): void => {
  if (
    equipment.main_image
    && !window.confirm('Remplacer l’image actuelle par une nouvelle image générée par IA ?')
  ) return
  deleteError.value = ''
  imageGenerationMessage.value = ''
  generateEquipmentImage(
    { uuid: equipment.uuid, replaceExisting: Boolean(equipment.main_image?.trim()) },
    {
      onSuccess: (result) => {
        syncEquipmentInList(result.equipment)
        selectedEquipment.value = result.equipment
        imageGenerationTone.value = 'success'
        imageGenerationMessage.value = 'Image générée et attachée à l’équipement.'
      },
      onError: (err) => {
        imageGenerationTone.value = 'error'
        imageGenerationMessage.value = err.message
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
    <AppToast
      :message="imageGenerationMessage"
      :tone="imageGenerationTone"
      @dismiss="imageGenerationMessage = ''"
    />

    <p v-if="deleteError" class="equipment-page__error">{{ deleteError }}</p>

    <section class="equipment-page__toolbar" aria-label="Filtres équipements">
      <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher un équipement">
        <div class="equipment-page__toolbar-actions">
          <CreateAction label="Créer un équipement" @click="openCreateModal" />
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
          :image-url="equipment.main_image"
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

    <EquipmentLayer
      v-for="session in equipmentLayers"
      :key="session.key"
      :uuid="session.uuid"
      :fallback-title="session.title"
      :expanded="layers.activeKey === session.key"
      @minimize="minimizeLayer(session.key)"
      @close="closeLayer(session.key)"
      @title-change="renameLayer(session.key, $event)"
      @updated="syncEquipmentInList($event)"
      @deleted="handleLayerDeleted(session.uuid)"
      @open-recipe="openRecipe"
    />
    <RecipeLayer
      v-for="session in recipeLayers"
      :key="session.key"
      :uuid="session.uuid"
      :fallback-title="session.title"
      :expanded="layers.activeKey === session.key"
      @minimize="minimizeLayer(session.key)"
      @close="closeLayer(session.key)"
      @title-change="renameLayer(session.key, $event)"
    />
    <ResourceLayerDock
      :sessions="layers.sessions"
      :active-key="layers.activeKey"
      @restore="restoreLayer"
      @close="closeLayer"
      @minimize="minimizeLayer"
    />

    <div v-if="selectedEquipment" class="equipment-page__modal-backdrop" @click.self="selectedEquipment = null">
      <section class="equipment-page__modal equipment-page__modal--info" role="dialog" aria-modal="true" :aria-label="`Fiche ${selectedEquipment.name}`">
        <header class="equipment-page__modal-header">
          <h2>{{ selectedEquipment.name }}</h2>
          <button type="button" class="equipment-page__modal-close" aria-label="Fermer" @click="selectedEquipment = null">×</button>
        </header>

        <div class="equipment-page__info">
          <div class="equipment-page__info-visual" aria-hidden="true">
            <img
              v-if="selectedEquipment.main_image"
              :src="selectedEquipment.main_image"
              :alt="selectedEquipment.name"
            />
            <span v-else>{{ equipmentInitial(selectedEquipment) }}</span>
          </div>

          <div class="equipment-page__info-main">
            <p>{{ selectedEquipment.description || 'Aucune description renseignée.' }}</p>
            <div class="equipment-page__modal-actions">
              <AppButton
                variant="secondary"
                :disabled="isGeneratingEquipmentImage"
                @click="generateImageForEquipment(selectedEquipment)"
              >
                {{ isGeneratingEquipmentImage ? 'Génération…' : 'Image IA' }}
              </AppButton>
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

  </main>
</template>

<style scoped>
.equipment-page {
  width: min(1440px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 18px 0 48px;
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
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

.equipment-page__modal--info {
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

.equipment-page__info-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
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

@media (max-width: 860px) {
  .equipment-page {
    width: min(100% - 24px, 100%);
    padding-top: 14px;
  }

  .equipment-page__info {
    grid-template-columns: minmax(0, 1fr);
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

}

@media (max-width: 560px) {
  .equipment-page__grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
}
</style>
