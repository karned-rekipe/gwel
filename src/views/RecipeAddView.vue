<script setup lang="ts">
import RecipeForm from '@/components/organisms/RecipeForm.vue'
</script>

<template>
  <main class="recipe-add-view">
    <RecipeForm />
  </main>
</template>

<style scoped>
.recipe-add-view {
  min-height: 100vh;
  background-color: var(--color-background, #f7fafc);
}
</style>
