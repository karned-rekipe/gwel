<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLoader from '@/components/atoms/AppLoader.vue'
import ResourceDetailHeader from '@/components/resources/ResourceDetailHeader.vue'
import { useDeleteIngredient, useIngredient, useIngredientRecipes } from '@/composables/useCatalogQueries'

const route = useRoute()
const router = useRouter()
const ingredientUuid = computed(() => route.params.id as string)

const { data: ingredient, isLoading, isError, error } = useIngredient(ingredientUuid)
const { data: recipes, isLoading: isLoadingRecipes } = useIngredientRecipes(ingredientUuid)
const { mutate: deleteIngredient, isPending: isDeleting } = useDeleteIngredient()

const goBack = (): void => {
  router.push({ name: 'ingredients-home' })
}

const removeIngredient = (): void => {
  if (!window.confirm('Supprimer cet ingrédient ?')) return
  deleteIngredient(ingredientUuid.value, {
    onSuccess: goBack,
  })
}
</script>

<template>
  <main class="catalog-detail">
    <div v-if="isLoading" class="catalog-detail__state">
      <AppLoader variant="spinner" />
    </div>

    <section v-else-if="isError || !ingredient" class="catalog-detail__state">
      <h1 class="catalog-detail__title">Ingrédient introuvable</h1>
      <p class="catalog-detail__text">{{ error?.message || 'La fiche n’est pas disponible.' }}</p>
    </section>

    <template v-else>
      <ResourceDetailHeader
        eyebrow="Ingrédient"
        :title="ingredient.name"
        can-delete
        :is-deleting="isDeleting"
        @back="goBack"
        @delete="removeIngredient"
      >
        <div class="catalog-detail__meta">
          <span>Unité {{ ingredient.unit || '—' }}</span>
          <span>Groupe {{ ingredient.group?.name || '—' }}</span>
          <span>Rayon {{ ingredient.rayon?.name || '—' }}</span>
          <span>Green score {{ ingredient.green_score ?? '—' }}</span>
        </div>
        <p class="catalog-detail__text">Saisonnalité : {{ Object.keys(ingredient.season_months).join(', ') || 'Toute saison' }}</p>
      </ResourceDetailHeader>

      <section class="catalog-detail__panel">
        <h2 class="catalog-detail__panel-title">Recettes associées</h2>
        <p v-if="isLoadingRecipes" class="catalog-detail__text">Chargement…</p>
        <p v-else-if="!recipes?.length" class="catalog-detail__text">Aucune recette associée.</p>
        <ul v-else class="catalog-detail__list">
          <li v-for="recipe in recipes" :key="recipe.uuid" class="catalog-detail__row">
            <router-link :to="{ name: 'recipes-detail', params: { id: recipe.uuid } }">
              {{ recipe.name }}
            </router-link>
            <span>{{ recipe.servings ?? '?' }} portion{{ recipe.servings && recipe.servings > 1 ? 's' : '' }}</span>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.catalog-detail {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.catalog-detail__text,
.catalog-detail__meta,
.catalog-detail__row span {
  color: var(--color-text-secondary);
}

.catalog-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.catalog-detail__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.05;
}

.catalog-detail__panel,
.catalog-detail__state {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.catalog-detail__panel-title {
  margin: 0 0 14px;
  color: var(--color-text-primary);
  font-size: 1.1rem;
}

.catalog-detail__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.catalog-detail__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.catalog-detail__row:last-child {
  border-bottom: 0;
}
</style>
