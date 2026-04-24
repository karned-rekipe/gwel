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
  min-height: calc(100vh - 88px);
}
</style>
