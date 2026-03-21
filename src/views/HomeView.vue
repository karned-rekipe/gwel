<script setup lang="ts">
import { onMounted } from 'vue'
import { useRecipeStore } from '@/stores/recipeStore'
import RecipeList from '@/components/organisms/RecipeList.vue'

const recipeStore = useRecipeStore()

onMounted(() => {
  recipeStore.fetchRecipes()
})
</script>

<template>
  <main class="home-view">
    <RecipeList />
  </main>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
  background-color: var(--color-background, #f7fafc);
}
</style>
