<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  variant?: 'neutral' | 'danger'
  disabled?: boolean
  showLabel?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="icon-action"
    :class="[
      `icon-action--${variant ?? 'neutral'}`,
      { 'icon-action--labeled': showLabel },
    ]"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click.stop="$emit('click')"
  >
    <span class="icon-action__icon" aria-hidden="true">{{ icon }}</span>
    <span v-if="showLabel" class="icon-action__label">{{ label }}</span>
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

.icon-action--labeled {
  width: auto;
  gap: 8px;
  padding-inline: 13px;
}

.icon-action__icon {
  flex: 0 0 auto;
}

.icon-action__label {
  white-space: nowrap;
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
