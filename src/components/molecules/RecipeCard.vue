<script setup lang="ts">
import type { Recipe } from '@/types/recipe'

defineProps<{
  recipe: Recipe
}>()

defineEmits<{
  click: [uuid: string]
}>()
</script>

<template>
  <article
    class="recipe-card"
    tabindex="0"
    :aria-label="`Voir la recette ${recipe.name}`"
    @click="$emit('click', recipe.uuid)"
    @keydown.enter="$emit('click', recipe.uuid)"
    @keydown.space.prevent="$emit('click', recipe.uuid)"
  >
    <div v-if="recipe.main_image" class="recipe-card__media">
      <img :src="recipe.main_image" :alt="recipe.name" class="recipe-card__image" />
    </div>
    <div v-else class="recipe-card__media recipe-card__media--placeholder">
      <span class="recipe-card__emoji">🍲</span>
    </div>

    <div class="recipe-card__body">
      <div class="recipe-card__heading">
        <h3 class="recipe-card__title">{{ recipe.name }}</h3>
        <p v-if="recipe.description" class="recipe-card__description">{{ recipe.description }}</p>
      </div>

      <div class="recipe-card__meta">
        <span class="recipe-card__meta-item">{{ recipe.servings ?? '?' }} pers.</span>
        <span class="recipe-card__meta-item">{{ recipe.ingredients.length }} ingrédients</span>
        <span class="recipe-card__meta-item">{{ recipe.steps.length }} étapes</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.recipe-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(109, 78, 40, 0.1);
  box-shadow: 0 22px 40px rgba(81, 58, 19, 0.08);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 48px rgba(81, 58, 19, 0.13);
}

.recipe-card__media {
  height: 210px;
  background: #f7efe0;
}

.recipe-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.recipe-card__media--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(255, 206, 98, 0.38), transparent 38%),
    linear-gradient(135deg, #f3d6a3 0%, #ebb26c 100%);
}

.recipe-card__emoji {
  font-size: 4rem;
}

.recipe-card__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  flex: 1;
}

.recipe-card__title {
  margin: 0;
  color: #2f2112;
  font-size: 1.32rem;
  font-weight: 800;
}

.recipe-card__description {
  margin: 10px 0 0;
  color: #6f5737;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recipe-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.recipe-card__meta-item {
  padding: 8px 10px;
  border-radius: 999px;
  background: #f7efe0;
  color: #7b5c2d;
  font-size: 0.86rem;
  font-weight: 700;
}
</style>
