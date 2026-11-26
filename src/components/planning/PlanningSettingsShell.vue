<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
  backTo?: 'hub' | 'planning'
}>()
</script>

<template>
  <main class="planning-settings-shell">
    <RouterLink
      :to="backTo === 'planning' ? { name: 'planning-list' } : { name: 'planning-preferences' }"
      class="planning-settings-shell__back"
    >
      {{ backTo === 'planning' ? 'Retour au planning' : 'Retour à la configuration' }}
    </RouterLink>

    <header class="planning-settings-shell__header">
      <p>{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <div class="planning-settings-shell__description">{{ description }}</div>
    </header>

    <slot />
  </main>
</template>

<style scoped>
.planning-settings-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 28px 20px 56px;
}

.planning-settings-shell__back {
  display: inline-flex;
  margin-bottom: 20px;
}

.planning-settings-shell__header {
  max-width: 720px;
  margin-bottom: 28px;
}

.planning-settings-shell__header p,
.planning-settings-shell__description {
  margin: 0;
  color: var(--color-text-secondary);
}

.planning-settings-shell__header p {
  font-size: 0.82rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.planning-settings-shell__header h1 {
  margin: 5px 0 8px;
  color: var(--color-text-primary);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.08;
}

.planning-settings-shell__description {
  line-height: 1.6;
}
</style>
