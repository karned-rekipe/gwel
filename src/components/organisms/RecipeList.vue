<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipeStore } from '@/stores/recipeStore'
import { storeToRefs } from 'pinia'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import AppButton from '@/components/atoms/AppButton.vue'
import AppLoader from '@/components/atoms/AppLoader.vue'

const router = useRouter()
const recipeStore = useRecipeStore()
const { filteredRecipes, loading, error, isEmpty, searchTerm } = storeToRefs(recipeStore)

const localSearchTerm = ref<string>(searchTerm.value)

const handleSearch = (value: string): void => {
  localSearchTerm.value = value
  recipeStore.setSearchTerm(value)
}

const handleRecipeClick = (id: string): void => {
  router.push({ name: 'recipe-detail', params: { id } })
}

const handleAddRecipe = (): void => {
  router.push({ name: 'recipe-add' })
}
</script>

<template>
  <div class="recipe-list">
    <!-- En-tête avec recherche et CTA -->
    <header class="recipe-list__header">
      <div class="recipe-list__header-content">
        <h1 class="recipe-list__title">Mes Recettes</h1>
        <p class="recipe-list__subtitle">Découvrez et partagez vos recettes préférées</p>
      </div>

      <div class="recipe-list__actions">
        <!-- Barre de recherche -->
        <div class="recipe-list__search">
          <AppInput
            id="recipe-search"
            :model-value="localSearchTerm"
            type="search"
            label="Rechercher"
            placeholder="Rechercher par titre ou ingrédient..."
            aria-label="Rechercher une recette par titre ou ingrédient"
            @update:model-value="handleSearch"
          />
        </div>

        <!-- Bouton CTA pour ajouter -->
        <AppButton
          variant="primary"
          aria-label="Ajouter une nouvelle recette"
          @click="handleAddRecipe"
        >
          ➕ Nouvelle recette
        </AppButton>
      </div>
    </header>

    <!-- État de chargement -->
    <div v-if="loading" class="recipe-list__loading">
      <AppLoader variant="skeleton" />
      <AppLoader variant="skeleton" />
      <AppLoader variant="skeleton" />
    </div>

    <!-- État d'erreur -->
    <div v-else-if="error" class="recipe-list__error" role="alert">
      <p class="recipe-list__error-message">❌ {{ error }}</p>
      <AppButton variant="secondary" @click="recipeStore.fetchRecipes()">
        Réessayer
      </AppButton>
    </div>

    <!-- État vide (aucune recette) -->
    <div v-else-if="isEmpty" class="recipe-list__empty">
      <div class="recipe-list__empty-icon">🍽️</div>
      <h2 class="recipe-list__empty-title">Aucune recette</h2>
      <p class="recipe-list__empty-text">Commencez par ajouter votre première recette !</p>
      <AppButton variant="primary" @click="handleAddRecipe">
        Ajouter une recette
      </AppButton>
    </div>

    <!-- État vide (résultat de recherche) -->
    <div v-else-if="filteredRecipes.length === 0" class="recipe-list__empty">
      <div class="recipe-list__empty-icon">🔍</div>
      <h2 class="recipe-list__empty-title">Aucun résultat</h2>
      <p class="recipe-list__empty-text">
        Aucune recette ne correspond à votre recherche "{{ searchTerm }}"
      </p>
      <AppButton variant="secondary" @click="recipeStore.clearSearch()">
        Effacer la recherche
      </AppButton>
    </div>

    <!-- Grille de recettes -->
    <div v-else class="recipe-list__grid">
      <RecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        :recipe="recipe"
        @click="handleRecipeClick"
      />
    </div>
  </div>
</template>

<style scoped>
.recipe-list {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* En-tête */
.recipe-list__header {
  margin-bottom: 32px;
}

.recipe-list__header-content {
  margin-bottom: 24px;
}

.recipe-list__title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.recipe-list__subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #718096);
  margin: 0;
}

/* Actions (Recherche + CTA) */
.recipe-list__actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipe-list__search {
  flex: 1;
  max-width: 500px;
}

/* Grille de recettes */
.recipe-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

/* État de chargement */
.recipe-list__loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

/* État d'erreur */
.recipe-list__error {
  text-align: center;
  padding: 64px 24px;
}

.recipe-list__error-message {
  font-size: 1.125rem;
  color: var(--color-danger, #dc3545);
  margin-bottom: 24px;
}

/* État vide */
.recipe-list__empty {
  text-align: center;
  padding: 64px 24px;
}

.recipe-list__empty-icon {
  font-size: 5rem;
  margin-bottom: 24px;
  opacity: 0.5;
}

.recipe-list__empty-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 12px 0;
}

.recipe-list__empty-text {
  font-size: 1rem;
  color: var(--color-text-secondary, #718096);
  margin: 0 0 24px 0;
}

/* Responsive */
@media (min-width: 640px) {
  .recipe-list {
    padding: 32px;
  }

  .recipe-list__actions {
    flex-direction: row;
    align-items: flex-end;
    gap: 24px;
  }

  .recipe-list__grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (min-width: 1024px) {
  .recipe-list {
    padding: 48px;
  }

  .recipe-list__title {
    font-size: 2.5rem;
  }
}
</style>
