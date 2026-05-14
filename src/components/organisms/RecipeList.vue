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
import { countryFlagFrom, countryOptions } from '@/utils/countryFlags'

const PER_PAGE = 50
const router = useRouter()
const navigation = useListNavigation('recipes')
const currentMonth = new Date().getMonth() + 1
const searchTerm = ref(navigation.state.search)
const filters = reactive({
  tag_uuid: navigation.state.filters.tag_uuid ?? '',
  difficulty: navigation.state.filters.difficulty ?? '',
  origin_country: navigation.state.filters.origin_country ?? '',
  price: navigation.state.filters.price ?? '',
  favorite: navigation.state.filters.favorite ?? '',
  season_mode: navigation.state.filters.season_mode ?? navigation.state.filters.season_month ?? '',
})

const queryFilters = computed(() => ({
  name: searchTerm.value.trim() || undefined,
  tag_uuid: filters.tag_uuid || undefined,
  difficulty: filters.difficulty || undefined,
  origin_country: filters.origin_country.trim().toUpperCase() || undefined,
  price: filters.price || undefined,
  favorite: filters.favorite === '' ? null : filters.favorite === 'true',
  season_month: filters.season_mode === 'current' ? String(currentMonth) : undefined,
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
  isFetchNextPageError,
  isFetchingNextPage,
} = useInfiniteRecipes(queryFilters)

const loadedRecipes = computed(() => data.value?.pages.flatMap((page) => page.data) ?? [])
const displayedRecipes = computed(() => {
  if (filters.season_mode !== 'year_round') return loadedRecipes.value
  return loadedRecipes.value.filter((recipe) => Object.keys(recipe.season_months ?? {}).length === 0)
})
const lastPagination = computed(() => {
  const pages = data.value?.pages ?? []
  return pages[pages.length - 1]?.pagination ?? null
})
const total = computed(() => (
  filters.season_mode === 'year_round'
    ? displayedRecipes.value.length
    : lastPagination.value?.total ?? displayedRecipes.value.length
))
const isEmpty = computed(() => !isLoading.value && displayedRecipes.value.length === 0)
const hasDisplayedRecipes = computed(() => displayedRecipes.value.length > 0)
const isBlockingError = computed(() => isError.value && !hasDisplayedRecipes.value)
const recoverableErrorMessage = computed(() => {
  if (!isFetchNextPageError.value || !hasDisplayedRecipes.value) return ''
  return error.value?.message.includes('timeout')
    ? 'Le chargement de la suite a pris trop de temps. Les recettes déjà chargées restent disponibles.'
    : error.value?.message || 'Chargement de la suite impossible.'
})


const filterState = computed(() => ({
  tag_uuid: filters.tag_uuid,
  difficulty: filters.difficulty,
  origin_country: filters.origin_country,
  price: filters.price,
  favorite: filters.favorite,
  season_mode: filters.season_mode,
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
    <ResourceList
      :is-loading="isLoading"
      :is-error="isBlockingError"
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
          <select v-model="filters.difficulty" class="recipe-list__control recipe-list__control--compact" aria-label="Filtrer par difficulté">
            <option value="">👨‍🍳</option>
            <option v-for="level in 5" :key="level" :value="String(level)">👨‍🍳 {{ level }}</option>
          </select>
          <select v-model="filters.origin_country" class="recipe-list__control" aria-label="Filtrer par origine">
            <option value="">⚑ Origine</option>
            <option v-for="country in countryOptions" :key="country.code" :value="country.code">
              {{ countryFlagFrom(country.code) }} {{ country.name }}
            </option>
          </select>
          <select v-model="filters.price" class="recipe-list__control recipe-list__control--compact" aria-label="Filtrer par prix">
            <option value="">€</option>
            <option v-for="level in 5" :key="level" :value="String(level)">{{ '€'.repeat(level) }}</option>
          </select>
          <select v-model="filters.favorite" class="recipe-list__control recipe-list__control--compact" aria-label="Filtrer par favori">
            <option value="">★</option>
            <option value="true">★ Oui</option>
            <option value="false">☆ Non</option>
          </select>
          <select v-model="filters.season_mode" class="recipe-list__control" aria-label="Filtrer par saison">
            <option value="">Non sélectionné</option>
            <option value="current">De saison</option>
            <option value="year_round">Toute saison</option>
          </select>
          <RouterLink to="/recipes/new" class="recipe-list__create" aria-label="Créer une recette">
            <span aria-hidden="true">＋</span>
            Créer
          </RouterLink>
        </div>
      </template>

      <div class="recipe-list__grid">
        <p v-if="recoverableErrorMessage" class="recipe-list__inline-error">
          {{ recoverableErrorMessage }}
        </p>
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
  padding: 18px 24px 48px;
}

.recipe-list__create {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
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
  grid-template-columns: minmax(220px, 1.8fr) minmax(106px, 0.8fr) 86px minmax(140px, 1fr) 78px 96px minmax(128px, 0.9fr) auto;
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

.recipe-list__control--compact {
  padding-inline: 8px;
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

.recipe-list__inline-error {
  grid-column: 1 / -1;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 28%, var(--color-border));
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-danger);
  font-size: 0.9rem;
  font-weight: 650;
}

@media (max-width: 980px) {
  .recipe-list__toolbar {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  }
}

@media (max-width: 560px) {
  .recipe-list__grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
}
</style>
