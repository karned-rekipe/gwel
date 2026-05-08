<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ResourceList from '@/components/resources/ResourceList.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import { useTags } from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { useInfiniteRecipes } from '@/composables/useRecipeQueries'
import type { Recipe } from '@/types/recipe'

const PER_PAGE = 50
const router = useRouter()
const navigation = useListNavigation('recipes')
const searchTerm = ref(navigation.state.search)
const filters = reactive({
  tag_uuid: navigation.state.filters.tag_uuid ?? '',
  difficulty: navigation.state.filters.difficulty ?? '',
  origin_country: navigation.state.filters.origin_country ?? '',
  price: navigation.state.filters.price ?? '',
  favorite: navigation.state.filters.favorite ?? '',
  season_month: navigation.state.filters.season_month ?? '',
})

const queryFilters = computed(() => ({
  name: searchTerm.value.trim() || undefined,
  tag_uuid: filters.tag_uuid || undefined,
  difficulty: filters.difficulty || undefined,
  origin_country: filters.origin_country.trim().toUpperCase() || undefined,
  price: filters.price || undefined,
  favorite: filters.favorite === '' ? null : filters.favorite === 'true',
  season_month: filters.season_month || undefined,
  per_page: PER_PAGE,
}))

const { data: tags } = useTags()
const {
  data,
  isLoading,
  isError,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteRecipes(queryFilters)

const displayedRecipes = computed(() => data.value?.pages.flatMap((page) => page.data) ?? [])
const lastPagination = computed(() => {
  const pages = data.value?.pages ?? []
  return pages[pages.length - 1]?.pagination ?? null
})
const total = computed(() => lastPagination.value?.total ?? displayedRecipes.value.length)
const isEmpty = computed(() => !isLoading.value && displayedRecipes.value.length === 0)


const filterState = computed(() => ({
  tag_uuid: filters.tag_uuid,
  difficulty: filters.difficulty,
  origin_country: filters.origin_country,
  price: filters.price,
  favorite: filters.favorite,
  season_month: filters.season_month,
}))

const loadRemaining = async (): Promise<void> => {
  while (hasNextPage.value) {
    await fetchNextPage()
  }
}

const handleRecipeClick = (recipe: Recipe): void => {
  navigation.navigateToDetail(
    router,
    { name: 'recipes-detail', params: { id: recipe.uuid } },
    {
      search: searchTerm.value,
      filters: { ...filterState.value },
      page: lastPagination.value?.page ?? 1,
      selectedUuid: recipe.uuid,
    },
  )
}

watch([searchTerm, filterState], () => {
  navigation.save({ search: searchTerm.value, filters: { ...filterState.value }, page: 1 })
})

watch(lastPagination, (pagination) => {
  if (!pagination) return
  navigation.save({ search: searchTerm.value, filters: { ...filterState.value }, page: pagination.page })
})

onMounted(() => {
  navigation.restoreScroll()
})
</script>

<template>
  <section class="recipe-list">
    <header class="recipe-list__header">
      <h1 class="recipe-list__title">Recettes</h1>
      <RouterLink to="/recipes/new" class="recipe-list__create">Nouvelle recette</RouterLink>
    </header>

    <ResourceList
      :is-loading="isLoading"
      :is-error="isError"
      :error-message="error?.message"
      :is-empty="isEmpty"
      :loaded-count="displayedRecipes.length"
      :total="total"
      :per-page="PER_PAGE"
      :has-next="hasNextPage"
      :is-fetching-more="isFetchingNextPage"
      @load-more="fetchNextPage()"
      @load-remaining="loadRemaining"
    >
      <template #toolbar>
        <div class="recipe-list__toolbar">
          <ResourceSearchBar v-model="searchTerm" placeholder="Rechercher une recette" />
          <select v-model="filters.tag_uuid" class="recipe-list__control" aria-label="Filtrer par tag">
            <option value="">Tags</option>
            <option v-for="tag in tags ?? []" :key="tag.uuid" :value="tag.uuid">{{ tag.name }}</option>
          </select>
          <select v-model="filters.difficulty" class="recipe-list__control" aria-label="Filtrer par difficulté">
            <option value="">Difficulté</option>
            <option v-for="level in 5" :key="level" :value="String(level)">{{ level }}/5</option>
          </select>
          <input v-model="filters.origin_country" class="recipe-list__control" aria-label="Filtrer par origine" placeholder="Origine" />
          <select v-model="filters.price" class="recipe-list__control" aria-label="Filtrer par prix">
            <option value="">Prix</option>
            <option v-for="level in 5" :key="level" :value="String(level)">{{ level }}/5</option>
          </select>
          <select v-model="filters.favorite" class="recipe-list__control" aria-label="Filtrer par favori">
            <option value="">Favoris</option>
            <option value="true">Favoris</option>
            <option value="false">Non favoris</option>
          </select>
          <select v-model="filters.season_month" class="recipe-list__control" aria-label="Filtrer par saison">
            <option value="">Saison</option>
            <option v-for="month in 12" :key="month" :value="String(month)">Mois {{ month }}</option>
          </select>
        </div>
      </template>

      <div class="recipe-list__grid">
        <RecipeCard
          v-for="recipe in displayedRecipes"
          :key="recipe.uuid"
          :recipe="recipe"
          @click="handleRecipeClick(recipe)"
        />
      </div>
    </ResourceList>
  </section>
</template>

<style scoped>
.recipe-list {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 22px 24px 48px;
}

.recipe-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.recipe-list__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(1.45rem, 2.4vw, 2rem);
  font-weight: 700;
}

.recipe-list__create {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
}

.recipe-list__create:hover {
  background: var(--color-primary-dark);
  color: #ffffff;
  text-decoration: none;
}

.recipe-list__toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1.8fr) repeat(6, minmax(112px, 1fr));
  gap: 8px;
  align-items: center;
}

.recipe-list__control {
  min-height: 38px;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

.recipe-list :deep(.resource-list__body) {
  display: block;
  border: none;
  border-radius: 0;
  background: transparent;
  gap: 0;
}

.recipe-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

@media (max-width: 980px) {
  .recipe-list__toolbar {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  }
}

@media (max-width: 560px) {
  .recipe-list__header {
    align-items: stretch;
    flex-direction: column;
  }

  .recipe-list__grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
}
</style>
