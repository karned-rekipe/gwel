import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { recipeService, type RecipeListFilters } from '@/services/recipeService'
import type { Recipe } from '@/types/recipe'

interface StoredRecipeCatalog {
  recipes: Recipe[]
  loadedAt: number
}

const STORAGE_KEY = 'rekipe:recipe-catalog:v1'
const LEGACY_STORAGE_KEY = 'rekipe:recipe-picker-cache:v1'
const CACHE_TTL_MS = 15 * 60 * 1000
const PAGE_SIZE = 100
const CATALOG_FILTERS: RecipeListFilters = {
  status: 'active',
  meal_planner_eligible: true,
}

const messageFrom = (err: unknown): string => (
  err instanceof Error ? err.message : 'Chargement des recettes impossible.'
)

const storage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const isStoredCatalog = (value: unknown): value is StoredRecipeCatalog => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredRecipeCatalog>
  return Array.isArray(candidate.recipes) && typeof candidate.loadedAt === 'number'
}

const fetchCatalogRecipes = async (): Promise<Recipe[]> => {
  const loadedRecipes: Recipe[] = []
  const visitedPages = new Set<number>()
  let page = 1

  while (!visitedPages.has(page)) {
    visitedPages.add(page)
    const response = await recipeService.getPage({
      ...CATALOG_FILTERS,
      page,
      per_page: PAGE_SIZE,
    })
    loadedRecipes.push(...response.data)

    const nextPage = response.pagination.next_page
    if (!nextPage) break
    page = nextPage
  }

  return loadedRecipes
}

export const useRecipeCatalogStore = defineStore('recipeCatalog', () => {
  const recipes = ref<Recipe[]>([])
  const loadedAt = ref(0)
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const hydrated = ref(false)
  let refreshPromise: Promise<void> | null = null
  const recipesByUuid = computed(() => new Map(recipes.value.map((recipe) => [recipe.uuid, recipe])))

  const isFresh = computed(() => (
    recipes.value.length > 0 && Date.now() - loadedAt.value < CACHE_TTL_MS
  ))

  const hydrateFromStorage = (): void => {
    if (hydrated.value) return
    hydrated.value = true

    const browserStorage = storage()
    if (!browserStorage) return

    try {
      for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
        const parsed = JSON.parse(browserStorage.getItem(key) ?? 'null') as unknown
        if (!isStoredCatalog(parsed) || parsed.recipes.length === 0) continue
        recipes.value = parsed.recipes
        loadedAt.value = parsed.loadedAt
        return
      }
    } catch {
      recipes.value = []
      loadedAt.value = 0
    }
  }

  const persist = (): void => {
    const browserStorage = storage()
    if (!browserStorage) return
    try {
      browserStorage.setItem(STORAGE_KEY, JSON.stringify({
        recipes: recipes.value,
        loadedAt: loadedAt.value,
      }))
    } catch {
      // Cache navigateur opportuniste : la copie mémoire reste la source locale principale.
    }
  }

  const markStale = (): void => {
    loadedAt.value = 0
  }

  const refresh = async (options: { force?: boolean; foreground?: boolean } = {}): Promise<void> => {
    hydrateFromStorage()
    if (!options.force && isFresh.value) return
    if (refreshPromise) {
      await refreshPromise
      return
    }

    const foreground = recipes.value.length === 0 || options.foreground === true
    loading.value = foreground
    refreshing.value = !foreground
    error.value = null

    refreshPromise = (async () => {
      try {
        const loadedRecipes = await fetchCatalogRecipes()
        recipes.value = loadedRecipes
        loadedAt.value = Date.now()
        persist()
      } catch (err) {
        error.value = messageFrom(err)
      } finally {
        loading.value = false
        refreshing.value = false
        refreshPromise = null
      }
    })()

    await refreshPromise
  }

  const ensureLoaded = async (): Promise<void> => {
    hydrateFromStorage()
    if (isFresh.value) return
    await refresh({ foreground: recipes.value.length === 0 })
  }

  const warmup = (): void => {
    hydrateFromStorage()
    if (isFresh.value) return
    void refresh({ foreground: false })
  }

  return {
    recipes,
    recipesByUuid,
    loadedAt,
    loading,
    refreshing,
    error,
    isFresh,
    hydrateFromStorage,
    markStale,
    refresh,
    ensureLoaded,
    warmup,
  }
})
