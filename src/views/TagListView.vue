<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import ResourceList from '@/components/resources/ResourceList.vue'
import ResourceRow from '@/components/resources/ResourceRow.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import SettingsNavigation from '@/components/settings/SettingsNavigation.vue'
import { useCreateTag, useDeleteTag, useUpdateTag } from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { tagService } from '@/services/tagService'
import type { Tag, TagCategory } from '@/types/recipe'
import type { PaginationInfo } from '@/types/api'

const PER_PAGE = 50
const router = useRouter()
const navigation = useListNavigation('tags')
const searchTerm = ref(navigation.state.search)
const tags = ref<Tag[]>([])
const pagination = ref<PaginationInfo | null>(null)
const currentPage = ref(navigation.state.page || 1)
const isLoading = ref(false)
const isFetchingMore = ref(false)
const loadError = ref('')
const editingUuid = ref<string | null>(null)
const deleteError = ref('')
const form = reactive({
  name: '',
  category: 'other' as TagCategory,
  color: '',
})

const { mutate: createTag, isPending: isCreating } = useCreateTag()
const { mutate: updateTag, isPending: isUpdating } = useUpdateTag()
const { mutate: deleteTag, isPending: isDeleting } = useDeleteTag()

const total = computed(() => pagination.value?.total ?? tags.value.length)
const hasNext = computed(() => pagination.value?.has_next ?? false)
const isEmpty = computed(() => !isLoading.value && tags.value.length === 0)

const fetchPage = async (page: number, append: boolean): Promise<void> => {
  const response = await tagService.getPage({
    name: searchTerm.value.trim() || undefined,
    page,
    per_page: PER_PAGE,
  })
  pagination.value = response.pagination
  currentPage.value = response.pagination.page
  tags.value = append ? [...tags.value, ...response.data] : response.data
}

const reload = async (pageCount = 1): Promise<void> => {
  isLoading.value = true
  loadError.value = ''
  tags.value = []
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
  form.category = 'other'
  form.color = ''
  editingUuid.value = null
}

const editTag = (tag: Tag): void => {
  editingUuid.value = tag.uuid
  form.name = tag.name
  form.category = tag.category
  form.color = tag.color ?? ''
}

const submit = (): void => {
  const payload = {
    name: form.name.trim(),
    category: form.category,
    color: form.color.trim() || null,
  }
  if (!payload.name) return

  const onSuccess = async (): Promise<void> => {
    resetForm()
    await reload(currentPage.value)
  }

  if (editingUuid.value) {
    updateTag({ uuid: editingUuid.value, data: payload }, { onSuccess })
    return
  }
  createTag(payload, { onSuccess })
}

const removeTag = (tag: Tag): void => {
  deleteError.value = ''
  deleteTag(tag.uuid, {
    onSuccess: async () => {
      await reload(currentPage.value)
    },
    onError: (err) => {
      deleteError.value = err.message
    },
  })
}

const openTag = (tag: Tag): void => {
  navigation.navigateToDetail(
    router,
    { name: 'tags-detail', params: { id: tag.uuid } },
    { search: searchTerm.value, page: currentPage.value, selectedUuid: tag.uuid },
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
    <SettingsNavigation />

    <section class="resource-page__editor">
      <AppInput id="tag-name" v-model="form.name" label="Nom" placeholder="Végan" required />
      <label class="resource-page__field">
        <span>Catégorie</span>
        <select v-model="form.category">
          <option value="diet">Alimentation</option>
          <option value="occasion">Occasion</option>
          <option value="service">Service</option>
          <option value="technique">Technique</option>
          <option value="other">Autre</option>
        </select>
      </label>
      <AppInput id="tag-color" v-model="form.color" label="Couleur" placeholder="#34c759" />
      <div class="resource-page__actions">
        <AppButton v-if="editingUuid" variant="secondary" @click="resetForm">Annuler</AppButton>
        <AppButton :disabled="!form.name.trim() || isCreating || isUpdating" @click="submit">
          {{ editingUuid ? 'Enregistrer' : 'Créer' }}
        </AppButton>
      </div>
    </section>

    <p v-if="deleteError" class="resource-page__error">{{ deleteError }}</p>

    <ResourceList
      :is-loading="isLoading"
      :is-error="!!loadError"
      :error-message="loadError"
      :is-empty="isEmpty"
      :loaded-count="tags.length"
      :total="total"
      :per-page="PER_PAGE"
      :has-next="hasNext"
      :is-fetching-more="isFetchingMore"
      @load-more="loadMore"
      @load-remaining="loadRemaining"
    >
      <template #toolbar>
        <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher un tag" />
      </template>

      <ResourceRow
        v-for="tag in tags"
        :key="tag.uuid"
        columns="minmax(0, 1fr) 120px minmax(130px, 0.8fr) auto"
        @click="openTag(tag)"
      >
        <strong class="resource-page__primary">{{ tag.name }}</strong>
        <span>{{ tag.category }}</span>
        <span>{{ tag.slug }}</span>
        <span class="resource-page__row-actions">
          <IconActionButton label="Modifier" icon="✎" @click="editTag(tag)" />
          <IconActionButton label="Supprimer" icon="×" variant="danger" :disabled="isDeleting" @click="removeTag(tag)" />
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  align-items: end;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.resource-page__field {
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.resource-page__field select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
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
</style>
