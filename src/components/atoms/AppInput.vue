<script setup lang="ts">
defineProps<{
  modelValue: string
  label: string
  id: string
  type?: 'text' | 'number' | 'email' | 'search'
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="app-input">
    <label :for="id" class="app-input__label">
      {{ label }}
      <span v-if="required" class="app-input__required" aria-label="Champ requis">*</span>
    </label>
    <input
      :id="id"
      :value="modelValue"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="app-input__field"
      :class="{ 'app-input__field--error': !!error }"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" :id="`${id}-error`" class="app-input__error" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<style scoped>
.app-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.app-input__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary, #2c3e50);
}

.app-input__required {
  color: var(--color-danger, #dc3545);
  margin-left: 4px;
}

.app-input__field {
  /* Taille tactile minimale */
  min-height: 44px;
  padding: 12px 16px;

  /* Typographie */
  font-size: 1rem;
  line-height: 1.5;

  /* Apparence */
  border: 2px solid var(--color-border, #cbd5e0);
  border-radius: 8px;
  background-color: var(--color-background, #ffffff);
  color: var(--color-text-primary, #2c3e50);

  /* Transitions */
  transition: all 0.2s ease-in-out;

  /* Accessibilité : outline */
  outline: none;
}

.app-input__field:hover:not(:disabled) {
  border-color: var(--color-border-hover, #a0aec0);
}

.app-input__field:focus {
  border-color: var(--color-primary, #4a90e2);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.app-input__field:focus-visible {
  outline: 2px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
}

.app-input__field:disabled {
  background-color: var(--color-background-disabled, #f7fafc);
  cursor: not-allowed;
  opacity: 0.6;
}

.app-input__field--error {
  border-color: var(--color-danger, #dc3545);
}

.app-input__field--error:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.app-input__error {
  font-size: 0.875rem;
  color: var(--color-danger, #dc3545);
  margin-top: -4px;
}
</style>
