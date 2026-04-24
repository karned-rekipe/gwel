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
      <p class="recipe-add-view__eyebrow">Volet 1</p>
      <h1 class="recipe-add-view__title">Créer une fiche recette complète</h1>
      <p class="recipe-add-view__subtitle">
        Le formulaire manuel et le flux IA parlent désormais le même contrat agrégé côté backend.
      </p>
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
  padding: 28px 24px 56px;
}

.recipe-add-view__hero {
  padding: 28px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 214, 10, 0.18), transparent 32%),
    linear-gradient(135deg, #fff8ec 0%, #fffdf8 100%);
  border: 1px solid rgba(194, 154, 54, 0.18);
}

.recipe-add-view__eyebrow {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8c5e15;
}

.recipe-add-view__title {
  margin: 0 0 10px;
  font-size: clamp(2rem, 4vw, 3.2rem);
  color: #2f2112;
  font-weight: 800;
}

.recipe-add-view__subtitle {
  margin: 0;
  color: #6f5737;
  line-height: 1.6;
}

.recipe-add-view__tabs {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  padding-bottom: 12px;
}

.recipe-add-view__tab {
  min-height: 46px;
  padding: 10px 16px;
  border: 1px solid rgba(111, 87, 55, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: #6f5737;
  font-weight: 700;
  cursor: pointer;
}

.recipe-add-view__tab--active {
  color: #2f2112;
  background: #ffeccd;
  border-color: rgba(194, 120, 36, 0.18);
}

.recipe-add-view__content {
  margin-top: 6px;
}
</style>
