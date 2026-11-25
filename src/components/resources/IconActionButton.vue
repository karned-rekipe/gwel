<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  variant?: 'neutral' | 'danger'
  disabled?: boolean
  showLabel?: boolean
  pill?: boolean
  active?: boolean
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
      {
        'icon-action--labeled': showLabel,
        'icon-action--pill': pill,
        'icon-action--active': active,
      },
    ]"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click.stop="$emit('click')"
  >
    <svg v-if="icon === 'photo'" class="icon-action__icon icon-action__icon--photo" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6.3 6.25 7.6 4.5h4.8l1.3 1.75h2.05c1.1 0 2 .9 2 2v6.25c0 1.1-.9 2-2 2H4.25c-1.1 0-2-.9-2-2V8.25c0-1.1.9-2 2-2H6.3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
      <circle cx="10" cy="11.25" r="3.1" stroke="currentColor" stroke-width="1.5" />
      <circle cx="15.25" cy="8.5" r="0.75" fill="currentColor" />
    </svg>
    <span v-else class="icon-action__icon" aria-hidden="true">{{ icon }}</span>
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

.icon-action--pill {
  min-height: 44px;
  height: 44px;
  border-radius: var(--radius-full);
}

.icon-action--pill.icon-action--labeled {
  padding-inline: 17px;
}

.icon-action--active {
  border-color: color-mix(in srgb, var(--color-primary) 42%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  color: var(--color-primary);
}

.icon-action__icon {
  flex: 0 0 auto;
}

.icon-action__icon--photo {
  width: 18px;
  height: 18px;
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
