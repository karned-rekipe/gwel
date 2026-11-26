<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ResourceList from '@/components/resources/ResourceList.vue'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import RecipeFilterControls from '@/components/organisms/RecipeFilterControls.vue'
import { useTags } from '@/composables/useCatalogQueries'
import { useListNavigation } from '@/composables/useListNavigation'
import { useInfiniteRecipes } from '@/composables/useRecipeQueries'
import type { Recipe } from '@/types/recipe'

const PER_PAGE = 50
const navigation = useListNavigation('recipes')
const emit = defineEmits<{
  open: [recipe: Recipe]
}>()
const currentMonth = new Date().getMonth() + 1
const searchTerm = ref(navigation.state.search)
const isFilterModalOpen = ref(false)
const mobileFilterTrigger = ref<HTMLButtonElement | null>(null)
const filterDialog = ref<HTMLElement | null>(null)
let bodyOverflowBeforeDialog = ''
let isBodyScrollLocked = false
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
const activeFilterCount = computed(() => [
  searchTerm.value.trim(),
  ...Object.values(filterState.value),
].filter(Boolean).length)
const recipeResultLabel = computed(() => `${total.value} recette${total.value > 1 ? 's' : ''}`)

const openFilterModal = (): void => {
  isFilterModalOpen.value = true
  void nextTick(() => filterDialog.value?.focus())
}

const closeFilterModal = (): void => {
  isFilterModalOpen.value = false
  void nextTick(() => mobileFilterTrigger.value?.focus())
}

const loadRemaining = async (): Promise<void> => {
  while (hasNextPage.value) {
    await fetchNextPage()
  }
}

const handleRecipeClick = (recipe: Recipe): void => {
  navigation.save({
    search: searchTerm.value,
    filters: { ...filterState.value },
    page: lastPagination.value?.page ?? 1,
    selectedUuid: recipe.uuid,
  })
  emit('open', recipe)
}

watch([searchTerm, filterState], () => {
  navigation.save({ search: searchTerm.value, filters: { ...filterState.value }, page: 1 })
})

watch(lastPagination, (pagination) => {
  if (!pagination) return
  navigation.save({ search: searchTerm.value, filters: { ...filterState.value }, page: pagination.page })
})

watch(isFilterModalOpen, (isOpen) => {
  if (isOpen) {
    bodyOverflowBeforeDialog = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    isBodyScrollLocked = true
    return
  }
  if (isBodyScrollLocked) {
    document.body.style.overflow = bodyOverflowBeforeDialog
    isBodyScrollLocked = false
  }
})

onMounted(() => {
  navigation.restoreScroll()
})

onBeforeUnmount(() => {
  if (isBodyScrollLocked) document.body.style.overflow = bodyOverflowBeforeDialog
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
        <div class="recipe-list__desktop-toolbar">
          <RecipeFilterControls
            v-model:search="searchTerm"
            v-model:tag-uuid="filters.tag_uuid"
            v-model:difficulty="filters.difficulty"
            v-model:origin-country="filters.origin_country"
            v-model:price="filters.price"
            v-model:favorite="filters.favorite"
            v-model:season-mode="filters.season_mode"
            :tags="tags ?? []"
          />
        </div>
        <button
          ref="mobileFilterTrigger"
          type="button"
          class="recipe-list__mobile-filter-trigger"
          aria-haspopup="dialog"
          :aria-expanded="isFilterModalOpen"
          @click="openFilterModal"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>Rechercher et filtrer</span>
          <span v-if="activeFilterCount" class="recipe-list__filter-count">{{ activeFilterCount }}</span>
        </button>
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

    <Teleport to="body">
      <div
        v-if="isFilterModalOpen"
        class="recipe-filter-modal"
        @click.self="closeFilterModal"
        @keydown.esc.stop="closeFilterModal"
      >
        <section
          ref="filterDialog"
          class="recipe-filter-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-filter-modal-title"
          tabindex="-1"
        >
          <header class="recipe-filter-modal__header">
            <div>
              <p>Catalogue</p>
              <h2 id="recipe-filter-modal-title">Rechercher et filtrer</h2>
            </div>
            <button type="button" class="recipe-filter-modal__close" aria-label="Réduire les filtres" @click="closeFilterModal">×</button>
          </header>

          <div class="recipe-filter-modal__body">
            <RecipeFilterControls
              v-model:search="searchTerm"
              v-model:tag-uuid="filters.tag_uuid"
              v-model:difficulty="filters.difficulty"
              v-model:origin-country="filters.origin_country"
              v-model:price="filters.price"
              v-model:favorite="filters.favorite"
              v-model:season-mode="filters.season_mode"
              :tags="tags ?? []"
            />
          </div>

          <footer class="recipe-filter-modal__footer">
            <button type="button" @click="closeFilterModal">Afficher {{ recipeResultLabel }}</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.recipe-list {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 18px 24px 48px;
}

.recipe-list :deep(.resource-list__toolbar) {
  position: sticky;
  z-index: 30;
  top: 60px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-background) 90%, transparent);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  backdrop-filter: saturate(150%) blur(18px);
}

.recipe-list__mobile-filter-trigger {
  display: none;
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

@media (max-width: 820px) {
  .recipe-list {
    padding: 12px 14px 36px;
  }

  .recipe-list :deep(.resource-list__toolbar) {
    top: 60px;
    padding: 6px;
    border-radius: 13px;
  }

  .recipe-list__desktop-toolbar {
    display: none;
  }

  .recipe-list__mobile-filter-trigger {
    width: 100%;
    min-height: 46px;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-weight: 720;
    text-align: left;
    box-shadow: 0 5px 16px rgba(15, 23, 42, 0.07);
  }

  .recipe-list__mobile-filter-trigger svg {
    width: 22px;
    height: 22px;
  }

  .recipe-list__filter-count {
    min-width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    padding-inline: 6px;
    border-radius: 999px;
    background: var(--color-primary);
    color: #fff;
    font-size: 0.76rem;
  }

  .recipe-list__grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
}

.recipe-filter-modal {
  position: fixed;
  z-index: 260;
  inset: 0;
  display: grid;
  align-items: end;
  padding: 12px;
  background: rgba(18, 25, 21, 0.42);
  backdrop-filter: blur(4px);
}

.recipe-filter-modal__panel {
  width: min(100%, 560px);
  max-height: calc(100dvh - 24px);
  margin: 0 auto;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid var(--color-border);
  border-radius: 22px;
  background: var(--color-surface);
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.28);
  outline: none;
}

.recipe-filter-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--color-border);
}

.recipe-filter-modal__header p,
.recipe-filter-modal__header h2 {
  margin: 0;
}

.recipe-filter-modal__header p {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.recipe-filter-modal__header h2 {
  margin-top: 3px;
  font-size: 1.18rem;
}

.recipe-filter-modal__close {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 1.55rem;
  line-height: 1;
}

.recipe-filter-modal__body {
  overflow-y: auto;
  padding: 16px 18px;
}

.recipe-filter-modal__footer {
  padding: 12px 18px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.recipe-filter-modal__footer button {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font: inherit;
  font-weight: 750;
}

</style>
