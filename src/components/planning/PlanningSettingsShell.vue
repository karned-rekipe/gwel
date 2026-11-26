<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="planning-settings-shell">
    <header class="planning-settings-shell__header">
      <h1>{{ title }}</h1>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.planning-settings-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 4px 20px 48px;
}

.planning-settings-shell__header {
  max-width: 720px;
  margin-bottom: 22px;
}

.planning-settings-shell__header h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.08;
}
</style>
