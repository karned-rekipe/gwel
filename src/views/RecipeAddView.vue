<script setup lang="ts">
import { ref } from 'vue'
import RecipeForm from '@/components/organisms/RecipeForm.vue'
import RecipeFormAI from '@/components/organisms/RecipeFormAI.vue'

type CreationMode = 'manual' | 'ai'

const currentMode = ref<CreationMode>('manual')

const setMode = (mode: CreationMode): void => {
  currentMode.value = mode
}
</script>

<template>
  <main class="recipe-add-view">
    <!-- Tabs de sélection du mode -->
    <div class="recipe-add-view__tabs" role="tablist" aria-label="Mode de création">
      <button
        class="recipe-add-view__tab"
        :class="{ 'recipe-add-view__tab--active': currentMode === 'manual' }"
        role="tab"
        :aria-selected="currentMode === 'manual'"
        :tabindex="currentMode === 'manual' ? 0 : -1"
        @click="setMode('manual')"
        @keydown.enter="setMode('manual')"
        @keydown.space.prevent="setMode('manual')"
      >
        📝 Création manuelle
      </button>
      <button
        class="recipe-add-view__tab"
        :class="{ 'recipe-add-view__tab--active': currentMode === 'ai' }"
        role="tab"
        :aria-selected="currentMode === 'ai'"
        :tabindex="currentMode === 'ai' ? 0 : -1"
        @click="setMode('ai')"
        @keydown.enter="setMode('ai')"
        @keydown.space.prevent="setMode('ai')"
      >
        🤖 Création avec IA
      </button>
    </div>

    <!-- Contenu du tab actif -->
    <div class="recipe-add-view__content">
      <RecipeForm v-if="currentMode === 'manual'" />
      <RecipeFormAI v-else-if="currentMode === 'ai'" />
    </div>
  </main>
</template>

<style scoped>
.recipe-add-view {
  min-height: 100vh;
  background-color: var(--color-background, #f7fafc);
}

/* Tabs */
.recipe-add-view__tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px 0;
  max-width: 800px;
  margin: 0 auto;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
}

.recipe-add-view__tab {
  flex: 1;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary, #718096);
  background-color: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  bottom: -2px;
  min-height: 44px;
  border-radius: 8px 8px 0 0;
}

.recipe-add-view__tab:hover {
  background-color: var(--color-background-soft, #f7fafc);
  color: var(--color-text-primary, #2c3e50);
}

.recipe-add-view__tab:focus {
  outline: 2px solid var(--color-primary, #3182ce);
  outline-offset: 2px;
}

.recipe-add-view__tab--active {
  color: var(--color-primary, #3182ce);
  background-color: var(--color-background, #ffffff);
  border-bottom-color: var(--color-primary, #3182ce);
}

/* Content */
.recipe-add-view__content {
  background-color: var(--color-background, #ffffff);
}

/* Responsive */
@media (min-width: 640px) {
  .recipe-add-view__tabs {
    padding: 24px 32px 0;
  }

  .recipe-add-view__tab {
    font-size: 1.125rem;
  }
}

@media (min-width: 768px) {
  .recipe-add-view__tabs {
    padding: 32px 40px 0;
  }
}
</style>
