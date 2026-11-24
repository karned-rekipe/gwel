<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import type { Equipment, EquipmentPayload } from '@/types/recipe'

const props = defineProps<{
  equipment: Equipment
  isSaving?: boolean
  isDeleting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: Partial<EquipmentPayload>]
  delete: []
}>()

const form = reactive({ name: '', description: '' })

watch(
  () => props.equipment,
  (equipment) => {
    form.name = equipment.name
    form.description = equipment.description ?? ''
  },
  { immediate: true },
)

const save = (): void => {
  const name = form.name.trim()
  if (!name) return
  emit('save', { name, description: form.description.trim() || null })
}
</script>

<template>
  <form class="equipment-editor" @submit.prevent="save">
    <header class="equipment-editor__header">
      <div>
        <p>Modifier la fiche</p>
        <h2>{{ equipment.name }}</h2>
      </div>
      <p class="equipment-editor__hint">
        Une description précise améliore le brief utilisé pour la génération de l’image.
      </p>
    </header>

    <section class="equipment-editor__card">
      <label>
        <span>Nom de l’ustensile</span>
        <input v-model="form.name" type="text" required autocomplete="off" />
      </label>
      <label>
        <span>Description</span>
        <small>Forme, matière, dimensions ou usage distinctif.</small>
        <textarea
          v-model="form.description"
          rows="6"
          placeholder="Ex. Moule rond en métal, 24 cm, à fond amovible…"
        ></textarea>
      </label>
    </section>

    <p v-if="error" class="equipment-editor__error">{{ error }}</p>
    <footer class="equipment-editor__actions">
      <AppButton class="equipment-editor__delete" type="button" variant="danger" :disabled="isSaving || isDeleting" @click="$emit('delete')">
        {{ isDeleting ? 'Suppression…' : 'Supprimer l’équipement' }}
      </AppButton>
      <div>
        <AppButton type="button" variant="secondary" :disabled="isDeleting" @click="$emit('cancel')">Annuler</AppButton>
        <AppButton type="submit" :disabled="isSaving || isDeleting || !form.name.trim()">
          {{ isSaving ? 'Enregistrement…' : 'Enregistrer' }}
        </AppButton>
      </div>
    </footer>
  </form>
</template>

<style scoped>
.equipment-editor {
  width: min(900px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.equipment-editor__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.7fr);
  align-items: end;
  gap: 24px;
}

.equipment-editor__header p,
.equipment-editor__header h2 { margin: 0; }
.equipment-editor__header > div > p {
  margin-bottom: 5px;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.equipment-editor__header h2 { font-size: clamp(1.7rem, 4vw, 2.7rem); }
.equipment-editor__hint { color: var(--color-text-secondary); line-height: 1.55; }

.equipment-editor__card {
  display: grid;
  gap: 18px;
  padding: clamp(18px, 3vw, 28px);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.equipment-editor label { display: grid; gap: 7px; }
.equipment-editor label > span { color: var(--color-text-primary); font-weight: 750; }
.equipment-editor label > small { color: var(--color-text-tertiary); }
.equipment-editor input,
.equipment-editor textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font: inherit;
}
.equipment-editor input { min-height: 48px; }
.equipment-editor textarea { resize: vertical; line-height: 1.55; }
.equipment-editor input:focus,
.equipment-editor textarea:focus {
  border-color: var(--color-focus);
  outline: 3px solid color-mix(in srgb, var(--color-focus) 18%, transparent);
}

.equipment-editor__actions {
  position: sticky;
  bottom: 8px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  background: rgba(249, 249, 250, 0.92);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(16px);
}
.equipment-editor__actions > div { display: flex; gap: 10px; }
.equipment-editor__error { margin: 0; color: var(--color-danger); font-weight: 650; }

@media (max-width: 720px) {
  .equipment-editor__header { grid-template-columns: 1fr; gap: 10px; }
  .equipment-editor__actions { align-items: stretch; flex-direction: column-reverse; }
  .equipment-editor__actions > div { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
