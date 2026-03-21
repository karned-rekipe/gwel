<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipes, useSearchRecipes } from '@/composables/useRecipeQueries'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import AppButton from '@/components/atoms/AppButton.vue'
import AppLoader from '@/components/atoms/AppLoader.vue'

const router = useRouter()
const searchTerm = ref<string>('')

// Vue Query - Récupération de toutes les recettes
const { data: allRecipes, isLoading, isError, error, isFetching } = useRecipes()

// Vue Query - Recherche (s'active seulement si searchTerm n'est pas vide)
const { data: searchResults } = useSearchRecipes(searchTerm)

// Computed pour déterminer quelles recettes afficher
const displayedRecipes = computed(() => {
  if (searchTerm.value.trim()) {
    return searchResults.value ?? []
  }
  return allRecipes.value ?? []
})

const isEmpty = computed(() => displayedRecipes.value.length === 0)

const handleSearch = (value: string): void => {
  searchTerm.value = value
}

const clearSearch = (): void => {
  searchTerm.value = ''
}

const handleRecipeClick = (uuid: string): void => {
  router.push({ name: 'recipe-detail', params: { id: uuid } })
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
            :model-value="searchTerm"
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
    <div v-if="isLoading" class="recipe-list__loading">
      <AppLoader variant="skeleton" />
      <AppLoader variant="skeleton" />
      <AppLoader variant="skeleton" />
    </div>

    <!-- État d'erreur -->
    <div v-else-if="isError" class="recipe-list__error" role="alert">
      <p class="recipe-list__error-message">
        ❌ {{ error?.message || 'Erreur lors du chargement des recettes' }}
      </p>
      <AppButton variant="secondary" @click="() => window.location.reload()">
        Réessayer
      </AppButton>
    </div>

    <!-- État vide (aucune recette) -->
    <div v-else-if="isEmpty && !searchTerm" class="recipe-list__empty">
      <div class="recipe-list__empty-icon">🍽️</div>
      <h2 class="recipe-list__empty-title">Aucune recette</h2>
      <p class="recipe-list__empty-text">Commencez par ajouter votre première recette !</p>
      <AppButton variant="primary" @click="handleAddRecipe">
        Ajouter une recette
      </AppButton>
    </div>

    <!-- État vide (résultat de recherche) -->
    <div v-else-if="isEmpty && searchTerm" class="recipe-list__empty">
      <div class="recipe-list__empty-icon">🔍</div>
      <h2 class="recipe-list__empty-title">Aucun résultat</h2>
      <p class="recipe-list__empty-text">
        Aucune recette ne correspond à votre recherche "{{ searchTerm }}"
      </p>
      <AppButton variant="secondary" @click="clearSearch">
        Effacer la recherche
      </AppButton>
    </div>

    <!-- Grille de recettes -->
    <div v-else class="recipe-list__grid">
      <!-- Indicateur de chargement pendant le fetch -->
      <div v-if="isFetching" class="recipe-list__fetching">
        Mise à jour...
      </div>

      <RecipeCard
        v-for="recipe in displayedRecipes"
        :key="recipe.uuid"
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
