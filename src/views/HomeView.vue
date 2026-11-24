<script setup lang="ts">
import { ref } from 'vue'
import RecipeLayer from '@/components/organisms/RecipeLayer.vue'
import RecipeList from '@/components/organisms/RecipeList.vue'
import ResourceLayerDock from '@/components/resources/ResourceLayerDock.vue'
import type { Recipe } from '@/types/recipe'
import {
  closeResourceLayer,
  createResourceLayersState,
  minimizeResourceLayer,
  openResourceLayer,
  renameResourceLayer,
  restoreResourceLayer,
  type ResourceLayersState,
} from '@/utils/resourceLayers'

const layers = ref<ResourceLayersState>(createResourceLayersState())

const openRecipe = (recipe: Recipe): void => {
  layers.value = openResourceLayer(layers.value, {
    kind: 'recipe',
    uuid: recipe.uuid,
    name: recipe.name,
  })
}

const restoreLayer = (key: string): void => { layers.value = restoreResourceLayer(layers.value, key) }
const minimizeLayer = (key: string): void => { layers.value = minimizeResourceLayer(layers.value, key) }
const closeLayer = (key: string): void => { layers.value = closeResourceLayer(layers.value, key) }
const renameLayer = (key: string, title: string): void => { layers.value = renameResourceLayer(layers.value, key, title) }
</script>

<template>
  <main class="home-view">
    <RecipeList @open="openRecipe" />
    <RecipeLayer
      v-for="session in layers.sessions"
      :key="session.key"
      :uuid="session.uuid"
      :fallback-title="session.title"
      :expanded="layers.activeKey === session.key"
      @minimize="minimizeLayer(session.key)"
      @close="closeLayer(session.key)"
      @title-change="renameLayer(session.key, $event)"
    />
    <ResourceLayerDock
      :sessions="layers.sessions"
      :active-key="layers.activeKey"
      @restore="restoreLayer"
      @close="closeLayer"
      @minimize="minimizeLayer"
    />
  </main>
</template>

<style scoped>
.home-view { min-height: calc(100vh - 88px); }
</style>
