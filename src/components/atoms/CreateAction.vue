<script setup lang="ts">
defineProps<{
  to?: string
  label: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <RouterLink v-if="to" :to="to" class="create-action" :aria-label="label">
    <span class="create-action__icon" aria-hidden="true">＋</span>
    <span>Créer</span>
  </RouterLink>
  <button v-else type="button" class="create-action" :aria-label="label" @click="$emit('click')">
    <span class="create-action__icon" aria-hidden="true">＋</span>
    <span>Créer</span>
  </button>
</template>

<style scoped>
.create-action {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 6px 16px 6px 7px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 70%, white);
  border-radius: var(--radius-full);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-primary) 92%, white),
    var(--color-primary-dark)
  );
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 20%, transparent);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 750;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition:
    box-shadow var(--transition-base),
    filter var(--transition-base),
    transform var(--transition-base);
}

.create-action__icon {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.16);
  font-size: 1rem;
  font-weight: 600;
}

.create-action:hover {
  box-shadow: 0 11px 25px color-mix(in srgb, var(--color-primary) 28%, transparent);
  color: #ffffff;
  filter: saturate(1.08);
  text-decoration: none;
  transform: translateY(-1px);
}

.create-action:active {
  box-shadow: 0 5px 12px color-mix(in srgb, var(--color-primary) 18%, transparent);
  transform: translateY(0);
}

.create-action:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
}
</style>
