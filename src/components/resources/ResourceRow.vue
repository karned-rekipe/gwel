<script setup lang="ts">
defineProps<{
  columns?: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <article class="resource-row" :style="{ gridTemplateColumns: columns }" tabindex="0" @click="$emit('click')" @keydown.enter="$emit('click')">
    <slot />
  </article>
</template>

<style scoped>
.resource-row {
  display: grid;
  gap: 10px;
  align-items: center;
  min-height: 44px;
  padding: 7px 10px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.resource-row:hover,
.resource-row:focus-visible {
  background: var(--color-surface-muted);
}

.resource-row:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: -2px;
}
</style>
