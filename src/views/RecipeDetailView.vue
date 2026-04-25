<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLoader from '@/components/atoms/AppLoader.vue'
import RecipeDetail from '@/components/organisms/RecipeDetail.vue'
import { useRecipe } from '@/composables/useRecipeQueries'

const route = useRoute()
const recipeUuid = computed(() => route.params.id as string)

const { data: recipe, isLoading, isError, error } = useRecipe(recipeUuid)
</script>

<template>
  <main class="recipe-detail-view">
    <div v-if="isLoading" class="recipe-detail-view__loading">
      <AppLoader variant="spinner" size="large" />
    </div>

    <div v-else-if="isError" class="recipe-detail-view__state">
      <h1 class="recipe-detail-view__title">Chargement impossible</h1>
      <p class="recipe-detail-view__text">
        {{ error?.message || 'La fiche recette n’a pas pu être récupérée.' }}
      </p>
      <router-link to="/recipes" class="recipe-detail-view__link">Retour aux recettes</router-link>
    </div>

    <div v-else-if="!recipe" class="recipe-detail-view__state">
      <h1 class="recipe-detail-view__title">Recette introuvable</h1>
      <p class="recipe-detail-view__text">
        La recette demandée n’existe pas ou n’est plus disponible.
      </p>
      <router-link to="/recipes" class="recipe-detail-view__link">Retour aux recettes</router-link>
    </div>

    <RecipeDetail v-else :recipe="recipe" />
  </main>
</template>

<style scoped>
.recipe-detail-view {
  min-height: calc(100vh - 88px);
}

.recipe-detail-view__loading,
.recipe-detail-view__state {
  max-width: 860px;
  margin: 0 auto;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
}

.recipe-detail-view__title {
  margin: 0 0 12px;
  color: var(--color-text-primary);
  font-size: 2rem;
  font-weight: 650;
}

.recipe-detail-view__text {
  margin: 0 0 24px;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.recipe-detail-view__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-weight: 600;
  text-decoration: none;
}

.recipe-detail-view__link:hover {
  text-decoration: none;
  background: var(--color-secondary);
}
</style>
