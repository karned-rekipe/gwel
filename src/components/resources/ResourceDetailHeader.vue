<script setup lang="ts">
import IconActionButton from '@/components/resources/IconActionButton.vue'

defineProps<{
  eyebrow?: string
  title: string
  canEdit?: boolean
  canDelete?: boolean
  isDeleting?: boolean
}>()

defineEmits<{
  back: []
  edit: []
  delete: []
}>()
</script>

<template>
  <header class="resource-detail-header">
    <div class="resource-detail-header__actions">
      <IconActionButton label="Retour" icon="←" @click="$emit('back')" />
      <IconActionButton v-if="canEdit" label="Modifier" icon="✎" @click="$emit('edit')" />
      <IconActionButton v-if="canDelete" label="Supprimer" icon="×" variant="danger" :disabled="isDeleting" @click="$emit('delete')" />
    </div>
    <p v-if="eyebrow" class="resource-detail-header__eyebrow">{{ eyebrow }}</p>
    <h1 class="resource-detail-header__title">{{ title }}</h1>
    <slot />
  </header>
</template>

<style scoped>
.resource-detail-header {
  display: grid;
  gap: 10px;
}

.resource-detail-header__actions {
  display: flex;
  gap: 6px;
}

.resource-detail-header__eyebrow {
  margin: 8px 0 0;
  color: var(--color-text-tertiary);
  font-size: 0.82rem;
  font-weight: 650;
}

.resource-detail-header__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(1.8rem, 5vw, 3.2rem);
  line-height: 1.05;
  font-weight: 700;
}
</style>
