<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import {
  useCreateIngredientGroup,
  useCreateIngredientRayon,
  useDeleteIngredientGroup,
  useDeleteIngredientRayon,
  useIngredientGroups,
  useIngredientRayons,
  useUpdateIngredientGroup,
  useUpdateIngredientRayon,
} from '@/composables/useCatalogQueries'
import type { IngredientGroup, IngredientRayon } from '@/types/recipe'

type Tab = 'groups' | 'rayons'

const activeTab = ref<Tab>('groups')
const editingUuid = ref<string | null>(null)
const deleteError = ref('')
const form = reactive({ name: '', description: '', sortOrder: '0' })

const { data: groups } = useIngredientGroups()
const { data: rayons } = useIngredientRayons()
const { mutate: createGroup, isPending: isCreatingGroup } = useCreateIngredientGroup()
const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateIngredientGroup()
const { mutate: deleteGroup, isPending: isDeletingGroup } = useDeleteIngredientGroup()
const { mutate: createRayon, isPending: isCreatingRayon } = useCreateIngredientRayon()
const { mutate: updateRayon, isPending: isUpdatingRayon } = useUpdateIngredientRayon()
const { mutate: deleteRayon, isPending: isDeletingRayon } = useDeleteIngredientRayon()

const rows = computed(() => (activeTab.value === 'groups' ? groups.value ?? [] : rayons.value ?? []))
const isBusy = computed(() => isCreatingGroup.value || isUpdatingGroup.value || isCreatingRayon.value || isUpdatingRayon.value)
const isDeleting = computed(() => isDeletingGroup.value || isDeletingRayon.value)

const resetForm = (): void => {
  form.name = ''
  form.description = ''
  form.sortOrder = '0'
  editingUuid.value = null
}

const editRow = (row: IngredientGroup | IngredientRayon): void => {
  editingUuid.value = row.uuid
  form.name = row.name
  form.description = row.description ?? ''
  form.sortOrder = String(row.sort_order ?? 0)
}

const submit = (): void => {
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
</script>

<template>
  <main class="settings-view">
    <header class="settings-view__tabs">
      <button :class="{ 'settings-view__tab--active': activeTab === 'groups' }" @click="activeTab = 'groups'; resetForm()">Groupes</button>
      <button :class="{ 'settings-view__tab--active': activeTab === 'rayons' }" @click="activeTab = 'rayons'; resetForm()">Rayons</button>
    </header>

    <section class="settings-view__editor">
      <AppInput id="setting-name" v-model="form.name" label="Nom" placeholder="Légumes" />
      <AppInput id="setting-description" v-model="form.description" label="Description" placeholder="Optionnel" />
      <AppInput id="setting-order" v-model="form.sortOrder" type="number" label="Ordre" placeholder="0" />
      <div class="settings-view__actions">
        <AppButton v-if="editingUuid" variant="secondary" @click="resetForm">Annuler</AppButton>
        <AppButton :disabled="!form.name.trim() || isBusy" @click="submit">{{ editingUuid ? 'Enregistrer' : 'Créer' }}</AppButton>
      </div>
    </section>

    <p v-if="deleteError" class="settings-view__error">{{ deleteError }}</p>

    <section class="settings-view__list">
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

.settings-view__row strong {
  color: var(--color-text-primary);
}

.settings-view__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.settings-view__error {
  margin: 0 0 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-danger);
  font-weight: 650;
}

@media (max-width: 900px) {
  .settings-view__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
