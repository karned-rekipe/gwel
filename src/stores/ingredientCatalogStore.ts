import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ingredientService } from '@/services/ingredientService'
import type { Ingredient } from '@/types/recipe'

interface StoredIngredientCatalog {
  ingredients: Ingredient[]
  loadedAt: number
}

const STORAGE_KEY = 'rekipe:ingredient-catalog:v1'
const CACHE_TTL_MS = 15 * 60 * 1000
const PAGE_SIZE = 100

const messageFrom = (err: unknown): string => (
  err instanceof Error ? err.message : 'Chargement des ingrédients impossible.'
)

const storage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const isStoredCatalog = (value: unknown): value is StoredIngredientCatalog => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredIngredientCatalog>
  return Array.isArray(candidate.ingredients) && typeof candidate.loadedAt === 'number'
}

const fetchCatalogIngredients = async (): Promise<Ingredient[]> => {
  const loadedIngredients: Ingredient[] = []
  const visitedPages = new Set<number>()
  let page = 1

  while (!visitedPages.has(page)) {
    visitedPages.add(page)
    const response = await ingredientService.getPage({
      page,
      per_page: PAGE_SIZE,
    })
    loadedIngredients.push(...response.data)

    const nextPage = response.pagination.next_page
    if (!nextPage) break
    page = nextPage
  }

  return loadedIngredients
}

export const useIngredientCatalogStore = defineStore('ingredientCatalog', () => {
  const ingredients = ref<Ingredient[]>([])
  const loadedAt = ref(0)
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const hydrated = ref(false)
  let refreshPromise: Promise<void> | null = null

  const isFresh = computed(() => (
    ingredients.value.length > 0 && Date.now() - loadedAt.value < CACHE_TTL_MS
  ))

  const hydrateFromStorage = (): void => {
    if (hydrated.value) return
    hydrated.value = true

    const browserStorage = storage()
    if (!browserStorage) return

    try {
      const parsed = JSON.parse(browserStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
      if (!isStoredCatalog(parsed) || parsed.ingredients.length === 0) return
      ingredients.value = parsed.ingredients
      loadedAt.value = parsed.loadedAt
    } catch {
      ingredients.value = []
      loadedAt.value = 0
    }
  }

  const persist = (): void => {
    const browserStorage = storage()
    if (!browserStorage) return
    try {
      browserStorage.setItem(STORAGE_KEY, JSON.stringify({
        ingredients: ingredients.value,
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

    const foreground = ingredients.value.length === 0 || options.foreground === true
    loading.value = foreground
    refreshing.value = !foreground
    error.value = null

    refreshPromise = (async () => {
      try {
        const loadedIngredients = await fetchCatalogIngredients()
        ingredients.value = loadedIngredients
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
    await refresh({ foreground: ingredients.value.length === 0 })
  }

  const warmup = (): void => {
    hydrateFromStorage()
    if (isFresh.value) return
    void refresh({ foreground: false })
  }

  return {
    ingredients,
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
