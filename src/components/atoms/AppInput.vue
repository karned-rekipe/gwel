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
  hideLabel?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="app-input">
    <label v-if="!hideLabel" :for="id" class="app-input__label">
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
      :aria-label="hideLabel ? label : undefined"
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
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.app-input__required {
  color: var(--color-danger);
  margin-left: 4px;
}

.app-input__field {
  min-height: 44px;
  padding: 12px 16px;
  font-size: 1rem;
  line-height: 1.4;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base);
  outline: none;
}

.app-input__field:hover:not(:disabled) {
  border-color: var(--color-border-hover);
}

.app-input__field:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}

.app-input__field:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.app-input__field:disabled {
  background: var(--color-background-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.app-input__field--error {
  border-color: var(--color-danger);
}

.app-input__field--error:focus {
  box-shadow: 0 0 0 3px rgba(215, 0, 21, 0.12);
}

.app-input__error {
  font-size: 0.875rem;
  color: var(--color-danger);
  margin-top: -4px;
}
</style>
