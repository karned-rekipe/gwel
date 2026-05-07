<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isMenuOpen = ref(false)

const isSettingsRoute = computed(() => ['ingredient-settings', 'tags-home', 'tags-detail'].includes(String(route.name)))

watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false
  },
)
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <nav class="app-shell__nav" aria-label="Navigation principale">
        <button
          type="button"
          class="app-shell__menu-button"
          :aria-expanded="isMenuOpen"
          :aria-label="isMenuOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'"
          aria-controls="app-navigation"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>

        <div class="app-shell__brand">
          <RouterLink to="/recipes" class="app-shell__logo">
            <span class="app-shell__logo-mark">R</span>
            <span>
              <span class="app-shell__logo-title">Rekipe</span>
            </span>
          </RouterLink>
        </div>

        <div
          id="app-navigation"
          :class="['app-shell__links', { 'app-shell__links--open': isMenuOpen }]"
        >
          <RouterLink
            to="/recipes"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Recettes
          </RouterLink>
          <RouterLink
            to="/planning"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Planning
          </RouterLink>
          <RouterLink
            to="/ingredients"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Ingrédients
          </RouterLink>
          <RouterLink
            to="/equipment"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Équipements
          </RouterLink>
          <RouterLink
            to="/shopping"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Courses
          </RouterLink>
        </div>

        <div class="app-shell__actions">
          <RouterLink
            to="/settings/ingredients"
            :class="['app-shell__icon-link', { 'app-shell__icon-link--active': isSettingsRoute }]"
            aria-label="Réglages"
            title="Réglages"
          >
            <span aria-hidden="true">⚙</span>
          </RouterLink>
        </div>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-background);
}

.app-shell__header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(245, 245, 247, 0.82);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: saturate(180%) blur(20px);
}

.app-shell__nav {
  max-width: 1240px;
  margin: 0 auto;
  padding: 10px clamp(16px, 4vw, 24px);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.app-shell__brand {
  grid-column: 1;
  min-width: 0;
}

.app-shell__logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-primary);
  text-decoration: none;
}

.app-shell__logo:hover {
  color: var(--color-text-primary);
  text-decoration: none;
}

.app-shell__logo-mark {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  font-weight: 700;
}

.app-shell__logo-title {
  display: block;
  font-size: 1rem;
  font-weight: 650;
}

.app-shell__links {
  grid-column: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.app-shell__actions {
  grid-column: 3;
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
}

.app-shell__link {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 0.92rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--transition-base), background var(--transition-base);
}

.app-shell__link {
  color: var(--color-text-secondary);
  background: transparent;
}

.app-shell__link:hover,
.app-shell__link--active {
  color: var(--color-text-primary);
  background: var(--color-secondary-dark);
  text-decoration: none;
}

.app-shell__icon-link,
.app-shell__menu-button {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  background: transparent;
  font: inherit;
  padding: 0;
  text-decoration: none;
  transition: color var(--transition-base), background var(--transition-base), border-color var(--transition-base);
}

.app-shell__icon-link:hover,
.app-shell__icon-link--active,
.app-shell__menu-button:hover {
  color: var(--color-text-primary);
  background: var(--color-secondary-dark);
  text-decoration: none;
}

.app-shell__link:focus-visible,
.app-shell__icon-link:focus-visible,
.app-shell__menu-button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.app-shell__menu-button {
  grid-column: 1;
  display: none;
  cursor: pointer;
}

.app-shell__menu-button span {
  width: 16px;
  height: 2px;
  display: block;
  border-radius: 999px;
  background: currentColor;
}

.app-shell__menu-button {
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 820px) {
  .app-shell__nav {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px 12px;
  }

  .app-shell__brand {
    grid-column: 2;
    grid-row: 1;
  }

  .app-shell__actions {
    grid-column: 3;
    grid-row: 1;
  }

  .app-shell__links {
    grid-column: 1 / -1;
    grid-row: 2;
    display: none;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
  }

  .app-shell__links--open {
    display: flex;
  }

  .app-shell__link {
    justify-content: flex-start;
    min-height: 42px;
  }

  .app-shell__menu-button {
    grid-row: 1;
    display: inline-flex;
  }
}

@media (min-width: 821px) {
  .app-shell__links {
    display: flex !important;
  }
}

@media (max-width: 360px) {
  .app-shell__logo-title {
    display: none;
  }
}
</style>
