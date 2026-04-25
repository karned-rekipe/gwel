<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'

const props = defineProps<{
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  isEmpty?: boolean
  loadedCount: number
  total: number
  perPage?: number
  hasNext?: boolean
  isFetchingMore?: boolean
}>()

defineEmits<{
  loadMore: []
  loadRemaining: []
}>()

const pageSize = computed(() => props.perPage ?? 50)
const remainingCount = computed(() => Math.max(0, props.total - props.loadedCount))
const nextCount = computed(() => Math.min(pageSize.value, remainingCount.value))
</script>

<template>
  <section class="resource-list">
    <div class="resource-list__toolbar">
      <slot name="toolbar" />
    </div>

    <div class="resource-list__body">
      <p v-if="isLoading" class="resource-list__state">Chargement…</p>
      <p v-else-if="isError" class="resource-list__state resource-list__state--error">
        {{ errorMessage || 'Chargement impossible.' }}
      </p>
      <p v-else-if="isEmpty" class="resource-list__state">Aucun élément.</p>
      <slot v-else />
    </div>

    <div v-if="hasNext && remainingCount > 0" class="resource-list__footer">
      <AppButton variant="secondary" :disabled="isFetchingMore" @click="$emit('loadMore')">
        {{ isFetchingMore ? 'Chargement…' : `Charger ${nextCount} éléments supplémentaires` }}
      </AppButton>
      <AppButton variant="secondary" :disabled="isFetchingMore" @click="$emit('loadRemaining')">
        Charger les {{ remainingCount }} éléments restants
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
.resource-list {
  display: grid;
  gap: 10px;
}

.resource-list__body {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.resource-list__state {
  margin: 0;
  padding: 14px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.resource-list__state--error {
  color: var(--color-danger);
  font-weight: 650;
}

.resource-list__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
