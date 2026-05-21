<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="resource-search">
    <input
      :value="modelValue"
      class="resource-search__input"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <slot />
  </div>
</template>

<style scoped>
.resource-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.resource-search__input {
  min-height: 38px;
  width: 100%;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  outline: none;
}

.resource-search__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}
</style>
