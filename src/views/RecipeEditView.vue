<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLoader from '@/components/atoms/AppLoader.vue'
import RecipeForm from '@/components/organisms/RecipeForm.vue'
import { useRecipe } from '@/composables/useRecipeQueries'

const route = useRoute()
const recipeUuid = computed(() => route.params.id as string)
const { data: recipe, isLoading, isError, error } = useRecipe(recipeUuid)
</script>

<template>
  <main class="recipe-edit-view">
    <div v-if="isLoading" class="recipe-edit-view__state">
      <AppLoader variant="spinner" size="large" />
    </div>
    <div v-else-if="isError || !recipe" class="recipe-edit-view__state">
      <h1 class="recipe-edit-view__title">Modification impossible</h1>
      <p class="recipe-edit-view__text">{{ error?.message || 'La recette est introuvable.' }}</p>
    </div>
    <RecipeForm v-else mode="edit" :recipe="recipe" />
  </main>
</template>

<style scoped>
.recipe-edit-view {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.recipe-edit-view__state {
  min-height: 50vh;
  display: grid;
  place-items: center;
  text-align: center;
}

.recipe-edit-view__title {
  margin: 0 0 8px;
  font-size: 1.8rem;
}

.recipe-edit-view__text {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
