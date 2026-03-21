<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <!-- En-tête sémantique avec navigation -->
    <header class="app__header">
      <nav class="app__nav" aria-label="Navigation principale">
        <div class="app__nav-content">
          <RouterLink to="/" class="app__logo">
            <span class="app__logo-icon">🍽️</span>
            <span class="app__logo-text">Recipe</span>
          </RouterLink>

          <div class="app__nav-links">
            <RouterLink to="/" class="app__nav-link" exact-active-class="app__nav-link--active">
              Accueil
            </RouterLink>
            <RouterLink to="/add" class="app__nav-link" exact-active-class="app__nav-link--active">
              Nouvelle recette
            </RouterLink>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <RouterView />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* En-tête */
.app__header {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app__nav {
  width: 100%;
}

.app__nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

/* Logo */
.app__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text-primary, #2c3e50);
  transition: var(--transition-base, 0.2s ease-in-out);
}

.app__logo:hover {
  color: var(--color-primary, #4a90e2);
  text-decoration: none;
  transform: scale(1.02);
}

.app__logo-icon {
  font-size: 2rem;
}

.app__logo:focus-visible {
  outline: 3px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
  border-radius: 8px;
}

/* Navigation */
.app__nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app__nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary, #718096);
  text-decoration: none;
  border-radius: 8px;
  transition: var(--transition-base, 0.2s ease-in-out);
}

.app__nav-link:hover {
  color: var(--color-primary, #4a90e2);
  background-color: var(--color-background-alt, #f7fafc);
  text-decoration: none;
}

.app__nav-link--active {
  color: var(--color-primary, #4a90e2);
  background-color: rgba(74, 144, 226, 0.1);
}

.app__nav-link:focus-visible {
  outline: 3px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 640px) {
  .app__nav-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .app__nav-links {
    width: 100%;
    justify-content: space-between;
  }

  .app__nav-link {
    flex: 1;
    justify-content: center;
  }

  .app__logo-text {
    display: none;
  }
}
</style>
