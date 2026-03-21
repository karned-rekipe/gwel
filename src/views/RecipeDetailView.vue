<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRecipes } from '@/composables/useRecipeQueries'
import RecipeDetail from '@/components/organisms/RecipeDetail.vue'
import AppLoader from '@/components/atoms/AppLoader.vue'

const route = useRoute()
const recipeUuid = computed(() => route.params.id as string)

// On utilise la liste (qui contient les données imbriquées) plutôt que l'endpoint de détail
const { data: recipes, isLoading, isError, error } = useRecipes()
const recipe = computed(() => recipes.value?.find((r) => r.uuid === recipeUuid.value))
</script>

<template>
  <main class="recipe-detail-view">
    <!-- État de chargement -->
    <div v-if="isLoading" class="recipe-detail-view__loading">
      <AppLoader variant="spinner" size="large" />
    </div>

    <!-- État d'erreur -->
    <div v-else-if="isError" class="recipe-detail-view__not-found">
      <h1 class="recipe-detail-view__not-found-title">Erreur</h1>
      <p class="recipe-detail-view__not-found-text">
        {{ error?.message || 'Impossible de charger la recette' }}
      </p>
      <router-link to="/" class="recipe-detail-view__link">
        Retour à la liste
      </router-link>
    </div>

    <!-- Recette introuvable -->
    <div v-else-if="!recipe" class="recipe-detail-view__not-found">
      <h1 class="recipe-detail-view__not-found-title">Recette introuvable</h1>
      <p class="recipe-detail-view__not-found-text">
        La recette que vous recherchez n'existe pas ou a été supprimée.
      </p>
      <router-link to="/" class="recipe-detail-view__link">
        Retour à la liste
      </router-link>
    </div>

    <!-- Affichage de la recette -->
    <RecipeDetail v-else :recipe="recipe" />
  </main>
</template>

<style scoped>
.recipe-detail-view {
  min-height: 100vh;
  background-color: var(--color-background, #f7fafc);
}

.recipe-detail-view__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
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
