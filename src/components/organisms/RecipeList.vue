<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import { useRecipes, useSearchRecipes } from '@/composables/useRecipeQueries'

const router = useRouter()
const searchTerm = ref('')

const { data: allRecipes, isLoading, isError, error, isFetching } = useRecipes()
const { data: searchResults } = useSearchRecipes(searchTerm)

const displayedRecipes = computed(() => {
  if (searchTerm.value.trim()) {
    return searchResults.value ?? []
  }

  return allRecipes.value ?? []
})

const isEmpty = computed(() => displayedRecipes.value.length === 0)

const handleRecipeClick = (uuid: string): void => {
  router.push({ name: 'recipes-detail', params: { id: uuid } })
}

const handleAddRecipe = (): void => {
  router.push({ name: 'recipes-new' })
}
</script>

<template>
  <section class="recipe-list">
    <header class="recipe-list__hero">
      <div class="recipe-list__copy">
        <p class="recipe-list__eyebrow">Volet 1</p>
        <h1 class="recipe-list__title">Mémoire culinaire du foyer</h1>
        <p class="recipe-list__subtitle">
          Le hub gwel centralise les recettes aujourd’hui, puis la planification et les courses.
        </p>
      </div>

      <div class="recipe-list__actions">
        <div class="recipe-list__search">
          <AppInput
            id="recipe-search"
            :model-value="searchTerm"
            type="search"
            label="Filtrer les recettes"
            placeholder="Nom de recette"
            @update:model-value="searchTerm = $event"
          />
        </div>

        <AppButton variant="primary" @click="handleAddRecipe">
          Nouvelle recette
        </AppButton>
      </div>
    </header>

    <div v-if="isLoading" class="recipe-list__loading">
      <AppLoader variant="skeleton" />
      <AppLoader variant="skeleton" />
      <AppLoader variant="skeleton" />
    </div>

    <div v-else-if="isError" class="recipe-list__state">
      <h2 class="recipe-list__state-title">Chargement impossible</h2>
      <p class="recipe-list__state-text">
        {{ error?.message || 'Les recettes ne sont pas accessibles pour le moment.' }}
      </p>
    </div>

    <div v-else-if="isEmpty" class="recipe-list__state">
      <h2 class="recipe-list__state-title">
        {{ searchTerm ? 'Aucun résultat' : 'Aucune recette disponible' }}
      </h2>
      <p class="recipe-list__state-text">
        {{
          searchTerm
            ? `Aucune recette ne correspond à "${searchTerm}".`
            : 'Commence par créer la première fiche recette complète.'
        }}
      </p>
    </div>

    <div v-else class="recipe-list__results">
      <div class="recipe-list__results-head">
        <p class="recipe-list__results-count">{{ displayedRecipes.length }} recette(s)</p>
        <p v-if="isFetching" class="recipe-list__results-refresh">Mise à jour…</p>
      </div>

      <div class="recipe-list__grid">
        <RecipeCard
          v-for="recipe in displayedRecipes"
          :key="recipe.uuid"
          :recipe="recipe"
          @click="handleRecipeClick"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.recipe-list {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 24px 56px;
}

.recipe-list__hero {
  display: grid;
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 211, 122, 0.26), transparent 34%),
    linear-gradient(135deg, #fff8ec 0%, #fffdf8 100%);
  border: 1px solid rgba(194, 154, 54, 0.18);
}

.recipe-list__eyebrow {
  margin: 0 0 10px;
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8c5e15;
}

.recipe-list__title {
  margin: 0 0 10px;
  font-size: clamp(2.1rem, 4vw, 3.5rem);
  font-weight: 800;
  color: #2f2112;
}

.recipe-list__subtitle,
.recipe-list__state-text,
.recipe-list__results-count {
  margin: 0;
  color: #6f5737;
  line-height: 1.65;
}

.recipe-list__actions {
  display: grid;
  gap: 14px;
  align-items: end;
}

.recipe-list__search {
  max-width: 440px;
}

.recipe-list__loading,
.recipe-list__grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  margin-top: 24px;
}

.recipe-list__state {
  margin-top: 24px;
  padding: 32px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(109, 78, 40, 0.08);
}

.recipe-list__state-title {
  margin: 0 0 10px;
  color: #2f2112;
  font-weight: 800;
}

.recipe-list__results {
  margin-top: 24px;
}

.recipe-list__results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.recipe-list__results-refresh {
  margin: 0;
  color: #8c5e15;
  font-weight: 700;
}

@media (min-width: 900px) {
  .recipe-list__hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }
}
</style>
