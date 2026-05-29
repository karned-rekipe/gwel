import { ref } from 'vue'
import { defineStore } from 'pinia'
import { isNotFoundError } from '@/services/http'
import { tenantPreferencesService } from '@/services/tenantPreferencesService'
import type { TenantPreferences, TenantPreferencesUpdate } from '@/types/tenantPreferences'

const defaultPreferences = (): TenantPreferences => ({
  uuid: 'local-tenant-preferences-placeholder',
  version: 0,
  exclusions: { ingredients: [], groups: [] },
  favorites: { recipes: [] },
  meal_slots: [
    { code: 'lunch', label: 'Déjeuner', position: 0 },
    { code: 'dinner', label: 'Dîner', position: 1 },
  ],
})

export const useTenantPreferencesStore = defineStore('tenantPreferences', () => {
  const current = ref<TenantPreferences | null>(null)
  const currentEtag = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPreferences(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { payload, etag } = await tenantPreferencesService.get()
      current.value = payload
      currentEtag.value = etag
    } catch (err) {
      if (isNotFoundError(err)) {
        current.value = defaultPreferences()
        currentEtag.value = null
        return
      }
      error.value = err instanceof Error ? err.message : 'Chargement impossible.'
    } finally {
      loading.value = false
    }
  }

  async function updatePreferences(payload: TenantPreferencesUpdate): Promise<void> {
    if (!currentEtag.value) throw new Error('Préférences non chargées.')
    const response = await tenantPreferencesService.update(currentEtag.value, payload)
    current.value = response.payload
    currentEtag.value = response.etag
  }

  return { current, currentEtag, loading, error, fetchPreferences, updatePreferences }
})
