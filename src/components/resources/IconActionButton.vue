<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  variant?: 'neutral' | 'danger'
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="icon-action"
    :class="`icon-action--${variant ?? 'neutral'}`"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click.stop="$emit('click')"
  >
    {{ icon }}
  </button>
</template>

<style scoped>
.icon-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
}

.icon-action:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  background: var(--color-secondary);
}

.icon-action--danger {
  color: var(--color-danger);
}

.icon-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
