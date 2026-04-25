<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <nav class="app-shell__nav" aria-label="Navigation principale">
        <div class="app-shell__brand">
          <RouterLink to="/recipes" class="app-shell__logo">
            <span class="app-shell__logo-mark">R</span>
            <span>
              <span class="app-shell__logo-title">Rekipe</span>
            </span>
          </RouterLink>
        </div>

        <div class="app-shell__links">
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
            to="/tags"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Tags
          </RouterLink>
          <RouterLink
            to="/settings/ingredients"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Réglages
          </RouterLink>
          <RouterLink
            to="/shopping"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Courses
          </RouterLink>
        </div>

        <div class="app-shell__meta">
          <RouterLink
            to="/recipes/new"
            class="app-shell__cta"
            active-class="app-shell__cta--active"
          >
            Nouvelle recette
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
  padding: 10px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.app-shell__brand {
  flex: 0 0 auto;
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

.app-shell__links,
.app-shell__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-shell__links {
  flex: 1 1 auto;
  flex-wrap: wrap;
  min-width: 0;
}

.app-shell__meta {
  margin-left: auto;
}

.app-shell__link,
.app-shell__cta {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 0.92rem;
  font-weight: 500;
  text-decoration: none;
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

.app-shell__cta {
  color: #ffffff;
  background: var(--color-primary);
}

.app-shell__cta:hover,
.app-shell__cta--active {
  color: #ffffff;
  background: var(--color-primary-dark);
  text-decoration: none;
}

@media (max-width: 680px) {
  .app-shell__nav {
    gap: 12px;
  }

  .app-shell__links,
  .app-shell__meta {
    flex-wrap: wrap;
  }

  .app-shell__meta {
    justify-content: space-between;
  }
}
</style>
