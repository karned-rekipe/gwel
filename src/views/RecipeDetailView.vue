<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRecipeStore } from '@/stores/recipeStore'
import { storeToRefs } from 'pinia'
import RecipeDetail from '@/components/organisms/RecipeDetail.vue'

const route = useRoute()
const recipeStore = useRecipeStore()
const { getRecipeById } = storeToRefs(recipeStore)

const recipeId = computed(() => route.params.id as string)
const recipe = computed(() => getRecipeById.value(recipeId.value))
</script>

<template>
  <main class="recipe-detail-view">
    <div v-if="!recipe" class="recipe-detail-view__not-found">
      <h1 class="recipe-detail-view__not-found-title">Recette introuvable</h1>
      <p class="recipe-detail-view__not-found-text">
        La recette que vous recherchez n'existe pas ou a été supprimée.
      </p>
      <router-link to="/" class="recipe-detail-view__link">
        Retour à la liste
      </router-link>
    </div>

    <RecipeDetail v-else :recipe="recipe" />
  </main>
</template>

<style scoped>
.recipe-detail-view {
  min-height: 100vh;
  background-color: var(--color-background, #f7fafc);
}

.recipe-detail-view__not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 24px;
}

.recipe-detail-view__not-found-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 16px 0;
}

.recipe-detail-view__not-found-text {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #718096);
  margin: 0 0 32px 0;
}

.recipe-detail-view__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background-color: var(--color-primary, #4a90e2);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}

.recipe-detail-view__link:hover {
  background-color: var(--color-primary-dark, #357abd);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.recipe-detail-view__link:focus-visible {
  outline: 3px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
}
</style>
