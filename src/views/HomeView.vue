<script setup lang="ts">
import { ref } from 'vue'
import RecipeLayer from '@/components/organisms/RecipeLayer.vue'
import RecipeList from '@/components/organisms/RecipeList.vue'
import type { Recipe } from '@/types/recipe'
import {
  closeRecipeLayer,
  createRecipeLayersState,
  minimizeRecipeLayer,
  openRecipeLayer,
  renameRecipeLayer,
  restoreRecipeLayer,
  type RecipeLayersState,
} from '@/utils/recipeLayers'

const layers = ref<RecipeLayersState>(createRecipeLayersState())

const openRecipe = (recipe: Recipe): void => {
  layers.value = openRecipeLayer(layers.value, recipe)
}

const restoreLayer = (uuid: string): void => {
  layers.value = restoreRecipeLayer(layers.value, uuid)
}

const minimizeLayer = (uuid: string): void => {
  layers.value = minimizeRecipeLayer(layers.value, uuid)
}

const closeLayer = (uuid: string): void => {
  layers.value = closeRecipeLayer(layers.value, uuid)
}

const renameLayer = (uuid: string, title: string): void => {
  layers.value = renameRecipeLayer(layers.value, uuid, title)
}
</script>

<template>
  <main class="home-view">
    <RecipeList @open="openRecipe" />

    <RecipeLayer
      v-for="session in layers.sessions"
      :key="session.uuid"
      :uuid="session.uuid"
      :fallback-title="session.title"
      :expanded="layers.activeUuid === session.uuid"
      @minimize="minimizeLayer(session.uuid)"
      @close="closeLayer(session.uuid)"
      @title-change="renameLayer(session.uuid, $event)"
    />

    <Teleport to="body">
      <aside v-if="layers.sessions.length" class="recipe-layer-dock" aria-label="Recettes ouvertes">
        <div class="recipe-layer-dock__items">
          <div
            v-for="session in layers.sessions"
            :key="`dock-${session.uuid}`"
            class="recipe-layer-dock__item"
            :class="{ 'recipe-layer-dock__item--active': layers.activeUuid === session.uuid }"
          >
            <button
              type="button"
              class="recipe-layer-dock__restore"
              :aria-pressed="layers.activeUuid === session.uuid"
              :title="`Afficher ${session.title}`"
              @click="restoreLayer(session.uuid)"
            >
              <span>{{ session.title }}</span>
            </button>
            <button
              type="button"
              class="recipe-layer-dock__close"
              :aria-label="`Fermer ${session.title}`"
              :title="`Fermer ${session.title}`"
              @click="closeLayer(session.uuid)"
            >
              ×
            </button>
          </div>
        </div>
        <button
          v-if="layers.activeUuid"
          type="button"
          class="recipe-layer-dock__minimize"
          title="Réduire la fiche active"
          aria-label="Réduire la fiche active"
          @click="minimizeLayer(layers.activeUuid)"
        >
          —
        </button>
      </aside>
    </Teleport>
  </main>
</template>

<style scoped>
.home-view {
  min-height: calc(100vh - 88px);
}

.recipe-layer-dock {
  position: fixed;
  z-index: 240;
  right: 32px;
  bottom: 6px;
  left: 32px;
  width: auto;
  max-width: 1600px;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 18px;
  background: rgba(249, 249, 250, 0.92);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(18px) saturate(150%);
  margin-inline: auto;
}

.recipe-layer-dock__items {
  min-width: 0;
  display: flex;
  flex: 1 1 auto;
  gap: 6px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}

.recipe-layer-dock__item {
  min-width: 150px;
  max-width: 260px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.recipe-layer-dock__item--active {
  border-color: rgba(29, 29, 31, 0.28);
  background: #ebe9e5;
  box-shadow: inset 0 0 0 1px rgba(29, 29, 31, 0.05);
}

.recipe-layer-dock__restore,
.recipe-layer-dock__close,
.recipe-layer-dock__minimize {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
}

.recipe-layer-dock__restore {
  min-width: 0;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 8px 0 12px;
  text-align: left;
}

.recipe-layer-dock__restore > span:last-child {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 0.8rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-layer-dock__close {
  width: 30px;
  height: 36px;
  font-size: 1rem;
  font-weight: 700;
}

.recipe-layer-dock__close:hover {
  color: var(--color-danger);
}

.recipe-layer-dock__minimize {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-weight: 800;
}

.recipe-layer-dock__minimize:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

@media (max-width: 620px) {
  .recipe-layer-dock {
    right: 7px;
    bottom: 4px;
    left: 7px;
    max-width: none;
    min-height: 54px;
  }

  .recipe-layer-dock__item {
    min-width: 136px;
  }
}
</style>
