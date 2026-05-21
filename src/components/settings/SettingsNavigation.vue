<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="settings-navigation">
    <h1 class="settings-navigation__title">Configuration</h1>
    <nav class="settings-navigation__links" aria-label="Configuration">
      <RouterLink
        to="/settings/ingredients"
        class="settings-navigation__link"
        active-class="settings-navigation__link--active"
      >
        Ingrédients
      </RouterLink>
      <RouterLink
        to="/settings/tags"
        class="settings-navigation__link"
        active-class="settings-navigation__link--active"
      >
        Tags
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.settings-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.settings-navigation__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(1.35rem, 2vw, 1.75rem);
  font-weight: 700;
}

.settings-navigation__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.settings-navigation__link {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-weight: 650;
  text-decoration: none;
}

.settings-navigation__link:hover,
.settings-navigation__link--active {
  color: var(--color-text-primary);
  background: var(--color-secondary-dark);
  text-decoration: none;
}

@media (max-width: 620px) {
  .settings-navigation {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-navigation__links {
    justify-content: flex-start;
  }
}
</style>
