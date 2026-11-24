<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLoader from '@/components/atoms/AppLoader.vue'
import EquipmentDetailPanel from '@/components/equipment/EquipmentDetailPanel.vue'
import EquipmentEditor from '@/components/equipment/EquipmentEditor.vue'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import { useDeleteEquipment, useEquipmentItem, useUpdateEquipment } from '@/composables/useCatalogQueries'
import type { EquipmentPayload } from '@/types/recipe'

const route = useRoute()
const router = useRouter()
const equipmentUuid = computed(() => route.params.id as string)
const mode = ref<'detail' | 'edit'>('detail')
const { data: equipment, isLoading, isError, error } = useEquipmentItem(equipmentUuid)
const { mutate: updateEquipment, isPending: isSaving, error: saveError } = useUpdateEquipment()
const { mutate: deleteEquipment, isPending: isDeleting, error: deleteError } = useDeleteEquipment()

const goBack = (): void => { router.push({ name: 'equipment-home' }) }
const save = (payload: Partial<EquipmentPayload>): void => {
  updateEquipment({ uuid: equipmentUuid.value, data: payload }, { onSuccess: () => { mode.value = 'detail' } })
}
const remove = (): void => {
  if (!equipment.value || !window.confirm(`Supprimer définitivement « ${equipment.value.name} » ?`)) return
  deleteEquipment(equipmentUuid.value, { onSuccess: goBack })
}
</script>

<template>
  <main class="catalog-route-detail">
    <header class="catalog-route-detail__toolbar">
      <IconActionButton label="Retour aux équipements" icon="←" show-label @click="goBack" />
    </header>
    <div v-if="isLoading" class="catalog-route-detail__state"><AppLoader variant="spinner" /><p>Chargement de l’équipement…</p></div>
    <div v-else-if="isError || !equipment" class="catalog-route-detail__state catalog-route-detail__state--error"><h1>Équipement introuvable</h1><p>{{ error?.message || 'La fiche n’est pas disponible.' }}</p></div>
    <EquipmentDetailPanel
      v-else-if="mode === 'detail'"
      :equipment="equipment"
      @edit="mode = 'edit'"
      @open-recipe="router.push({ name: 'recipes-detail', params: { id: $event.uuid } })"
    />
    <div v-else class="catalog-route-detail__editor">
      <EquipmentEditor
        :equipment="equipment"
        :is-saving="isSaving"
        :is-deleting="isDeleting"
        :error="saveError?.message || deleteError?.message"
        @cancel="mode = 'detail'"
        @delete="remove"
        @save="save"
      />
    </div>
  </main>
</template>

<style scoped>
.catalog-route-detail { min-height: calc(100vh - 64px); background: #fbf8f1; }
.catalog-route-detail__toolbar { position: sticky; top: 61px; z-index: 20; padding: 9px clamp(18px,3vw,40px); border-bottom: 1px solid var(--color-border); background: rgba(255,255,255,.88); backdrop-filter: blur(16px); }
.catalog-route-detail__editor { padding: clamp(18px,3vw,40px); }
.catalog-route-detail__state { min-height: 60vh; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 32px; text-align: center; }
.catalog-route-detail__state h1, .catalog-route-detail__state p { margin: 0; }
.catalog-route-detail__state--error { color: var(--color-danger); }
</style>
