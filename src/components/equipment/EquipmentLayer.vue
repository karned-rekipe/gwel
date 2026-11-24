<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import EquipmentDetailPanel from '@/components/equipment/EquipmentDetailPanel.vue'
import EquipmentEditor from '@/components/equipment/EquipmentEditor.vue'
import ResourceLayerShell from '@/components/resources/ResourceLayerShell.vue'
import { useDeleteEquipment, useEquipmentItem, useUpdateEquipment } from '@/composables/useCatalogQueries'
import type { Equipment, EquipmentPayload, Recipe } from '@/types/recipe'

const props = defineProps<{
  uuid: string
  fallbackTitle: string
  expanded: boolean
}>()

const emit = defineEmits<{
  close: []
  minimize: []
  titleChange: [title: string]
  updated: [equipment: Equipment]
  deleted: []
  openRecipe: [recipe: Recipe]
}>()

const mode = ref<'detail' | 'edit'>('detail')
const equipmentUuid = computed(() => props.uuid)
const { data: equipment, isLoading, isError, error, refetch } = useEquipmentItem(equipmentUuid)
const { mutate: updateEquipment, isPending: isSaving, error: saveError } = useUpdateEquipment()
const { mutate: deleteEquipment, isPending: isDeleting, error: deleteError } = useDeleteEquipment()
const title = computed(() => equipment.value?.name || props.fallbackTitle)

watch(
  () => equipment.value?.name,
  (name) => { if (name) emit('titleChange', name) },
  { immediate: true },
)

const save = (payload: Partial<EquipmentPayload>): void => {
  updateEquipment(
    { uuid: props.uuid, data: payload },
    {
      onSuccess: (updated) => {
        emit('updated', updated)
        emit('titleChange', updated.name)
        mode.value = 'detail'
      },
    },
  )
}

const remove = (): void => {
  if (!equipment.value || !window.confirm(`Supprimer définitivement « ${equipment.value.name} » ?`)) return
  deleteEquipment(props.uuid, {
    onSuccess: () => {
      emit('deleted')
      emit('close')
    },
  })
}
</script>

<template>
  <ResourceLayerShell
    :title="title"
    resource-label="Fiche équipement"
    :expanded="expanded"
    :edit-mode="mode === 'edit'"
    @minimize="$emit('minimize')"
    @close="$emit('close')"
  >
    <div v-if="isLoading" class="equipment-layer__state"><AppLoader variant="spinner" /><p>Chargement de l’équipement…</p></div>
    <div v-else-if="isError || !equipment" class="equipment-layer__state equipment-layer__state--error">
      <h2>Chargement impossible</h2>
      <p>{{ error?.message || 'L’équipement n’est plus disponible.' }}</p>
      <button type="button" @click="refetch()">Réessayer</button>
    </div>
    <EquipmentDetailPanel
      v-else-if="mode === 'detail'"
      :equipment="equipment"
      @edit="mode = 'edit'"
      @updated="$emit('updated', $event)"
      @open-recipe="$emit('openRecipe', $event)"
    />
    <EquipmentEditor
      v-else
      :equipment="equipment"
      :is-saving="isSaving"
      :is-deleting="isDeleting"
      :error="saveError?.message || deleteError?.message"
      @cancel="mode = 'detail'"
      @delete="remove"
      @save="save"
    />
  </ResourceLayerShell>
</template>

<style scoped>
.equipment-layer__state { min-height: 55vh; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 32px; text-align: center; }
.equipment-layer__state p,
.equipment-layer__state h2 { margin: 0; }
.equipment-layer__state--error { color: var(--color-danger); }
.equipment-layer__state button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); cursor: pointer; font: inherit; font-weight: 700; }
</style>
