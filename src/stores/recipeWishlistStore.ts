import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { recipeService } from '@/services/recipeService'
import type { Recipe } from '@/types/recipe'

interface WishlistEntry {
  recipeUuid: string
  addedAt: string
}

const storageKey = 'rekipe:wishlist:v1:anonymous'

const readEntries = (): WishlistEntry[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as WishlistEntry[]
    return Array.isArray(parsed) ? parsed.filter((entry) => entry.recipeUuid) : []
  } catch {
    return []
  }
}

export const useRecipeWishlistStore = defineStore('recipeWishlist', () => {
  const entries = ref<WishlistEntry[]>(readEntries())
  const recipes = ref<Recipe[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const recipeUuids = computed(() => entries.value.map((entry) => entry.recipeUuid))
  const count = computed(() => entries.value.length)

  const persist = (): void => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(storageKey, JSON.stringify(entries.value))
  }

  const has = (recipeUuid: string): boolean => recipeUuids.value.includes(recipeUuid)

  const add = (recipeUuid: string): void => {
    if (has(recipeUuid)) return
    entries.value = [{ recipeUuid, addedAt: new Date().toISOString() }, ...entries.value]
    persist()
  }

  const remove = (recipeUuid: string): void => {
    entries.value = entries.value.filter((entry) => entry.recipeUuid !== recipeUuid)
    recipes.value = recipes.value.filter((recipe) => recipe.uuid !== recipeUuid)
    persist()
  }

  const toggle = (recipeUuid: string): boolean => {
    if (has(recipeUuid)) {
      remove(recipeUuid)
      return false
    }
    add(recipeUuid)
    return true
  }

  const loadRecipes = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const loaded = await Promise.all(
        entries.value.map(async (entry) => {
          try {
            return await recipeService.getByUuid(entry.recipeUuid)
          } catch {
            return null
          }
        }),
      )
      recipes.value = loaded.filter((recipe): recipe is Recipe => recipe !== null)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Chargement de la liste d’envies impossible.'
    } finally {
      loading.value = false
    }
  }

  return {
    entries,
    recipes,
    loading,
    error,
    recipeUuids,
    count,
    has,
    add,
    remove,
    toggle,
    loadRecipes,
  }
})
