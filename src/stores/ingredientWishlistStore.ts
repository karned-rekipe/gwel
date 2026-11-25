import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ingredientService } from '@/services/ingredientService'
import type { Ingredient } from '@/types/recipe'

interface IngredientWishlistEntry {
  ingredientUuid: string
  addedAt: string
}

const storageKey = 'rekipe:ingredient-wishlist:v1:anonymous'

const readEntries = (): IngredientWishlistEntry[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as IngredientWishlistEntry[]
    return Array.isArray(parsed) ? parsed.filter((entry) => entry.ingredientUuid) : []
  } catch {
    return []
  }
}

export const useIngredientWishlistStore = defineStore('ingredientWishlist', () => {
  const entries = ref<IngredientWishlistEntry[]>(readEntries())
  const ingredients = ref<Ingredient[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const ingredientUuids = computed(() => entries.value.map((entry) => entry.ingredientUuid))
  const count = computed(() => entries.value.length)

  const persist = (): void => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(storageKey, JSON.stringify(entries.value))
  }

  const has = (ingredientUuid: string): boolean => ingredientUuids.value.includes(ingredientUuid)

  const add = (ingredientUuid: string): void => {
    if (has(ingredientUuid)) return
    entries.value = [{ ingredientUuid, addedAt: new Date().toISOString() }, ...entries.value]
    persist()
  }

  const remove = (ingredientUuid: string): void => {
    entries.value = entries.value.filter((entry) => entry.ingredientUuid !== ingredientUuid)
    ingredients.value = ingredients.value.filter((ingredient) => ingredient.uuid !== ingredientUuid)
    persist()
  }

  const toggle = (ingredientUuid: string): boolean => {
    if (has(ingredientUuid)) {
      remove(ingredientUuid)
      return false
    }
    add(ingredientUuid)
    return true
  }

  const loadIngredients = async (): Promise<void> => {
    const requestedUuids = [...new Set(ingredientUuids.value)]
    if (!requestedUuids.length) {
      ingredients.value = []
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const loaded = await Promise.all(requestedUuids.map(async (uuid) => {
        try {
          return await ingredientService.getByUuid(uuid)
        } catch {
          return null
        }
      }))
      const byUuid = new Map(
        loaded.filter((ingredient): ingredient is Ingredient => ingredient !== null)
          .map((ingredient) => [ingredient.uuid, ingredient]),
      )
      ingredients.value = requestedUuids
        .map((uuid) => byUuid.get(uuid) ?? null)
        .filter((ingredient): ingredient is Ingredient => ingredient !== null)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Chargement des envies ingrédients impossible.'
    } finally {
      loading.value = false
    }
  }

  return {
    entries,
    ingredients,
    loading,
    error,
    ingredientUuids,
    count,
    has,
    add,
    remove,
    toggle,
    loadIngredients,
  }
})
