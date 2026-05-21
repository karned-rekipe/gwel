<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    :class="['app-button', `app-button--${variant ?? 'primary'}`]"
    :aria-label="ariaLabel"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  min-height: 44px;
  min-width: 44px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    color var(--transition-base),
    opacity var(--transition-base);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  outline: none;
}

.app-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.app-button--primary {
  background: var(--color-primary);
  color: #ffffff;
}

.app-button--primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.app-button--primary:active:not(:disabled) {
  background: var(--color-primary-dark);
}

.app-button--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.app-button--secondary:hover:not(:disabled) {
  background: var(--color-secondary);
  border-color: var(--color-border-hover);
}

.app-button--danger {
  background: var(--color-danger);
  color: #ffffff;
}

.app-button--danger:hover:not(:disabled) {
  background: var(--color-danger-dark);
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
