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
    <header class="recipe-add-view__hero">
      <h1 class="recipe-add-view__title">Nouvelle recette</h1>
    </header>

    <div class="recipe-add-view__tabs" role="tablist" aria-label="Mode de création">
      <button
        class="recipe-add-view__tab"
        :class="{ 'recipe-add-view__tab--active': currentMode === 'manual' }"
        role="tab"
        :aria-selected="currentMode === 'manual'"
        :tabindex="currentMode === 'manual' ? 0 : -1"
        @click="setMode('manual')"
      >
        Création manuelle
      </button>
      <button
        class="recipe-add-view__tab"
        :class="{ 'recipe-add-view__tab--active': currentMode === 'ai' }"
        role="tab"
        :aria-selected="currentMode === 'ai'"
        :tabindex="currentMode === 'ai' ? 0 : -1"
        @click="setMode('ai')"
      >
        Création avec IA
      </button>
    </div>

    <div class="recipe-add-view__content">
      <RecipeForm v-if="currentMode === 'manual'" />
      <RecipeFormAI v-else />
    </div>
  </main>
</template>

<style scoped>
.recipe-add-view {
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 24px 56px;
}

.recipe-add-view__hero {
  margin-bottom: 24px;
}

.recipe-add-view__title {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 4.2rem);
  color: var(--color-text-primary);
  font-weight: 700;
  line-height: 1;
}

.recipe-add-view__tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.recipe-add-view__tab {
  min-height: 46px;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition-base),
    color var(--transition-base),
    border-color var(--transition-base);
}

.recipe-add-view__tab--active {
  color: var(--color-text-primary);
  background: var(--color-secondary-dark);
  border-color: var(--color-border-hover);
}

.recipe-add-view__content {
  margin-top: 6px;
}
</style>
