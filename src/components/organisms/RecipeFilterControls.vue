<script setup lang="ts">
import CreateAction from '@/components/atoms/CreateAction.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import type { Tag } from '@/types/recipe'
import { countryFlagFrom, countryOptions } from '@/utils/countryFlags'

defineProps<{
  tags: Tag[]
}>()

const search = defineModel<string>('search', { required: true })
const tagUuid = defineModel<string>('tagUuid', { required: true })
const difficulty = defineModel<string>('difficulty', { required: true })
const originCountry = defineModel<string>('originCountry', { required: true })
const price = defineModel<string>('price', { required: true })
const favorite = defineModel<string>('favorite', { required: true })
const seasonMode = defineModel<string>('seasonMode', { required: true })
</script>

<template>
  <div class="recipe-filter-controls">
    <ResourceSearchBar v-model="search" placeholder="Rechercher une recette" />
    <select v-model="tagUuid" class="recipe-filter-controls__control" aria-label="Filtrer par tag">
      <option value="">Tags</option>
      <option v-for="tag in tags" :key="tag.uuid" :value="tag.uuid">{{ tag.name }}</option>
    </select>
    <select
      v-model="difficulty"
      class="recipe-filter-controls__control recipe-filter-controls__control--compact"
      aria-label="Filtrer par difficulté"
    >
      <option value="">👨‍🍳</option>
      <option v-for="level in 5" :key="level" :value="String(level)">👨‍🍳 {{ level }}</option>
    </select>
    <select v-model="originCountry" class="recipe-filter-controls__control" aria-label="Filtrer par origine">
      <option value="">⚑ Origine</option>
      <option v-for="country in countryOptions" :key="country.code" :value="country.code">
        {{ countryFlagFrom(country.code) }} {{ country.name }}
      </option>
    </select>
    <select
      v-model="price"
      class="recipe-filter-controls__control recipe-filter-controls__control--compact"
      aria-label="Filtrer par prix"
    >
      <option value="">€</option>
      <option v-for="level in 5" :key="level" :value="String(level)">{{ '€'.repeat(level) }}</option>
    </select>
    <select
      v-model="favorite"
      class="recipe-filter-controls__control recipe-filter-controls__control--compact"
      aria-label="Filtrer par favori"
    >
      <option value="">★</option>
      <option value="true">★ Oui</option>
      <option value="false">☆ Non</option>
    </select>
    <select v-model="seasonMode" class="recipe-filter-controls__control" aria-label="Filtrer par saison">
      <option value="">Non sélectionné</option>
      <option value="current">De saison</option>
      <option value="year_round">Toute saison</option>
    </select>
    <CreateAction to="/recipes/new" label="Créer une recette" />
  </div>
</template>

<style scoped>
.recipe-filter-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1.8fr) minmax(106px, 0.8fr) 86px minmax(140px, 1fr) 78px 96px minmax(128px, 0.9fr) auto;
  gap: 8px;
  align-items: center;
}

.recipe-filter-controls__control {
  min-height: 38px;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

.recipe-filter-controls__control--compact {
  padding-inline: 8px;
}

@media (max-width: 1100px) {
  .recipe-filter-controls {
    grid-template-columns: repeat(4, minmax(132px, 1fr));
  }
}

@media (max-width: 820px) {
  .recipe-filter-controls {
    grid-template-columns: 1fr;
  }

  .recipe-filter-controls :deep(.create-action) {
    width: 100%;
  }
}
</style>
