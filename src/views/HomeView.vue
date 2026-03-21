<script setup lang="ts">
import RecipeList from '@/components/organisms/RecipeList.vue'
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
