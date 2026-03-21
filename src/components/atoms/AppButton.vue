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
  /* Taille tactile minimale de 44px */
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;

  /* Typographie */
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;

  /* Apparence */
  border: none;
  border-radius: 8px;
  cursor: pointer;

  /* Transitions */
  transition: all 0.2s ease-in-out;

  /* Flexbox pour centrer le contenu */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  /* Accessibilité : focus visible */
  outline: none;
}

.app-button:focus-visible {
  outline: 3px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
}

/* Variant Primary */
.app-button--primary {
  background-color: var(--color-primary, #4a90e2);
  color: white;
}

.app-button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark, #357abd);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.app-button--primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

/* Variant Secondary */
.app-button--secondary {
  background-color: var(--color-secondary, #6c757d);
  color: white;
}

.app-button--secondary:hover:not(:disabled) {
  background-color: var(--color-secondary-dark, #5a6268);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Variant Danger */
.app-button--danger {
  background-color: var(--color-danger, #dc3545);
  color: white;
}

.app-button--danger:hover:not(:disabled) {
  background-color: var(--color-danger-dark, #c82333);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* État disabled */
.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
</style>
