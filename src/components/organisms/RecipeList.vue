<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ResourceList from '@/components/resources/ResourceList.vue'
import ResourceRow from '@/components/resources/ResourceRow.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
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

const totalTimeLabel = (recipe: Recipe): string => {
  const totalTime = recipe.steps.reduce(
    (total, step) =>
      total + (step.total_time ?? (step.preparation_time ?? 0) + (step.cooking_time ?? 0) + (step.rest_time ?? 0)),
    0,
  )
  if (totalTime <= 0) return '—'
  const hours = Math.floor(totalTime / 60)
  const minutes = totalTime % 60
  return hours ? `${hours} h${minutes ? ` ${minutes}` : ''}` : `${minutes} min`
}

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

      <ResourceRow
        v-for="recipe in displayedRecipes"
        :key="recipe.uuid"
        columns="minmax(0, 1.4fr) 76px minmax(120px, 1fr) 72px 72px 86px"
        @click="handleRecipeClick(recipe)"
      >
        <strong class="recipe-list__name">{{ recipe.name }}</strong>
        <span>{{ recipe.origin_country || '—' }}</span>
        <span class="recipe-list__tags">{{ recipe.tags.map((tag) => tag.name).slice(0, 3).join(', ') || '—' }}</span>
        <span>{{ recipe.favorite ? '★' : '—' }}</span>
        <span>{{ recipe.difficulty ? `${recipe.difficulty}/5` : '—' }}</span>
        <span class="recipe-list__time">{{ totalTimeLabel(recipe) }}</span>
      </ResourceRow>
    </ResourceList>
  </section>
</template>

<style scoped>
.recipe-list {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 20px 48px;
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

.recipe-list__name {
  overflow: hidden;
  color: var(--color-text-primary);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-list__tags {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-list__time {
  justify-self: end;
  color: var(--color-text-tertiary);
  font-weight: 650;
}

@media (max-width: 980px) {
  .recipe-list__toolbar {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  }
}
</style>
