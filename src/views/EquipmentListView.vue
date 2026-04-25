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
  useCreateEquipment,
  useDeleteEquipment,
  useEquipmentDuplicates,
  useMergeEquipmentDuplicates,
  useUpdateEquipment,
} from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { equipmentService } from '@/services/equipmentService'
import type { DuplicateGroup, Equipment } from '@/types/recipe'
import type { PaginationInfo } from '@/types/api'

const PER_PAGE = 50
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

const reload = async (pageCount = 1): Promise<void> => {
  isLoading.value = true
  loadError.value = ''
  equipmentItems.value = []
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
  form.description = ''
  editingUuid.value = null
}

const editEquipment = (equipment: Equipment): void => {
  editingUuid.value = equipment.uuid
  form.name = equipment.name
  form.description = equipment.description ?? ''
}

const submit = (): void => {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
  }
  if (!payload.name) return

  const onSuccess = async (): Promise<void> => {
    resetForm()
    await reload(currentPage.value)
    await refetchDuplicates()
  }

  if (editingUuid.value) {
    updateEquipment({ uuid: editingUuid.value, data: payload }, { onSuccess })
    return
  }
  createEquipment(payload, { onSuccess })
}

const removeEquipment = (equipment: Equipment): void => {
  deleteError.value = ''
  deleteEquipment(equipment.uuid, {
    onSuccess: async () => {
      await reload(currentPage.value)
      await refetchDuplicates()
    },
    onError: (err) => {
      deleteError.value = err.message
    },
  })
}

const openEquipment = (equipment: Equipment): void => {
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
  await reload(1)
})

onMounted(async () => {
  await reload(navigation.state.page || 1)
  await navigation.restoreScroll()
})
</script>

<template>
  <main class="resource-page">
    <section class="resource-page__editor">
      <AppInput id="equipment-name" v-model="form.name" label="Nom" placeholder="Four" required />
      <AppInput id="equipment-description" v-model="form.description" label="Description" placeholder="Optionnel" />
      <div class="resource-page__actions">
        <AppButton v-if="editingUuid" variant="secondary" @click="resetForm">Annuler</AppButton>
        <AppButton :disabled="!form.name.trim() || isCreating || isUpdating" @click="submit">
          {{ editingUuid ? 'Enregistrer' : 'Créer' }}
        </AppButton>
      </div>
    </section>

    <p v-if="deleteError" class="resource-page__error">{{ deleteError }}</p>

    <section v-if="duplicateGroups?.length" class="resource-page__dedupe">
      <article v-for="group in duplicateGroups" :key="group.normalized_name" class="resource-page__dedupe-row">
        <span>{{ group.normalized_name }}</span>
        <select v-model="duplicateTargets[group.normalized_name]">
          <option v-for="item in group.items" :key="item.uuid" :value="item.uuid">{{ item.name }}</option>
        </select>
        <AppButton variant="secondary" :disabled="isMerging" @click="mergeDuplicateGroup(group)">
          Fusionner
        </AppButton>
      </article>
    </section>

    <ResourceList
      :is-loading="isLoading"
      :is-error="!!loadError"
      :error-message="loadError"
      :is-empty="isEmpty"
      :loaded-count="equipmentItems.length"
      :total="total"
      :per-page="PER_PAGE"
      :has-next="hasNext"
      :is-fetching-more="isFetchingMore"
      @load-more="loadMore"
      @load-remaining="loadRemaining"
    >
      <template #toolbar>
        <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher un ustensile" />
      </template>

      <ResourceRow
        v-for="equipment in equipmentItems"
        :key="equipment.uuid"
        columns="minmax(0, 1fr) minmax(160px, 1fr) auto"
        @click="openEquipment(equipment)"
      >
        <strong class="resource-page__primary">{{ equipment.name }}</strong>
        <span>{{ equipment.description || '—' }}</span>
        <span class="resource-page__row-actions">
          <IconActionButton label="Modifier" icon="✎" @click="editEquipment(equipment)" />
          <IconActionButton label="Supprimer" icon="×" variant="danger" :disabled="isDeleting" @click="removeEquipment(equipment)" />
        </span>
      </ResourceRow>
    </ResourceList>
  </main>
</template>

<style scoped>
.resource-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 20px 48px;
}

.resource-page__editor {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.4fr) auto;
  gap: 8px;
  align-items: end;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.resource-page__actions,
.resource-page__row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.resource-page__primary {
  overflow: hidden;
  color: var(--color-text-primary);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-page__error {
  margin: 0 0 10px;
  color: var(--color-danger);
  font-weight: 650;
}

.resource-page__dedupe {
  display: grid;
  gap: 1px;
  overflow: hidden;
  margin-bottom: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.resource-page__dedupe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 260px) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: var(--color-surface);
}

.resource-page__dedupe select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

@media (max-width: 760px) {
  .resource-page__editor,
  .resource-page__dedupe-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
