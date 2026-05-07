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
  useUpdateIngredient,
} from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { ingredientService } from '@/services/ingredientService'
import { shoppingService } from '@/services/shoppingService'
import type { DuplicateGroup, Ingredient } from '@/types/recipe'
import type { PaginationInfo } from '@/types/api'
import type { Supplier } from '@/types/shopping'

const PER_PAGE = 50
const router = useRouter()
const navigation = useListNavigation('ingredients')
const searchTerm = ref(navigation.state.search)
const ingredients = ref<Ingredient[]>([])
const suppliers = ref<Supplier[]>([])
const pagination = ref<PaginationInfo | null>(null)
const currentPage = ref(navigation.state.page || 1)
const isLoading = ref(false)
const isFetchingMore = ref(false)
const loadError = ref('')
const editingUuid = ref<string | null>(null)
const deleteError = ref('')
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

const total = computed(() => pagination.value?.total ?? ingredients.value.length)
const hasNext = computed(() => pagination.value?.has_next ?? false)
const isEmpty = computed(() => !isLoading.value && ingredients.value.length === 0)
const supplierByUuid = computed(() => new Map(suppliers.value.map((supplier) => [supplier.uuid, supplier.name] as const)))
const secondarySuppliers = computed(() => suppliers.value.filter((supplier) => supplier.uuid !== form.mainSupplierUuid))

const supplierName = (uuid: string | null | undefined): string => {
  if (!uuid) return '—'
  return supplierByUuid.value.get(uuid) ?? 'Fournisseur inconnu'
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

const editIngredient = (ingredient: Ingredient): void => {
  editingUuid.value = ingredient.uuid
  form.name = ingredient.name
  form.unit = ingredient.unit ?? ''
  form.groupUuid = ingredient.group_uuid ?? ''
  form.rayonUuid = ingredient.rayon_uuid ?? ''
  form.mainSupplierUuid = ingredient.main_supplier_uuid ?? ''
  form.secondarySupplierUuids = ingredient.secondary_supplier_uuids ?? []
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
    resetForm()
    await reload(currentPage.value)
    await refetchDuplicates()
  }

  if (editingUuid.value) {
    updateIngredient({ uuid: editingUuid.value, data: payload }, { onSuccess })
    return
  }

  createIngredient(payload, { onSuccess })
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
    <section class="resource-page__editor">
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
          <router-link :to="{ name: 'ingredient-settings' }" class="resource-page__settings" title="Réglages ingrédients">
            ⚙
          </router-link>
        </ResourceSearchBar>
      </template>

      <ResourceRow
        v-for="ingredient in ingredients"
        :key="ingredient.uuid"
        columns="minmax(0, 1.4fr) minmax(110px, 0.7fr) minmax(110px, 0.7fr) minmax(130px, 0.8fr) 70px auto"
        @click="openIngredient(ingredient)"
      >
        <strong class="resource-page__primary">{{ ingredient.name }}</strong>
        <span>{{ ingredient.group?.name || '—' }}</span>
        <span>{{ ingredient.rayon?.name || '—' }}</span>
        <span>{{ supplierName(ingredient.main_supplier_uuid) }}</span>
        <span>{{ ingredient.unit || '—' }}</span>
        <span class="resource-page__row-actions">
          <IconActionButton label="Modifier" icon="✎" @click="editIngredient(ingredient)" />
          <IconActionButton label="Supprimer" icon="×" variant="danger" :disabled="isDeleting" @click="removeIngredient(ingredient)" />
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

.resource-page__field select,
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
.resource-page__row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
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

@media (max-width: 860px) {
  .resource-page__dedupe-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
