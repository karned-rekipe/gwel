import { nextTick, reactive } from 'vue'
import type { Router, RouteLocationRaw } from 'vue-router'

interface ListNavigationState {
  search: string
  filters: Record<string, string>
  page: number
  scrollY: number
  selectedUuid?: string
}

const states = reactive<Record<string, ListNavigationState>>({})

const defaultState = (): ListNavigationState => ({
  search: '',
  filters: {},
  page: 1,
  scrollY: 0,
})

export function useListNavigation(key: string) {
  if (!states[key]) {
    states[key] = defaultState()
  }

  const state = states[key]

  const save = (patch: Partial<ListNavigationState> = {}): void => {
    Object.assign(state, {
      scrollY: window.scrollY,
      ...patch,
    })
  }

  const navigateToDetail = async (
    router: Router,
    to: RouteLocationRaw,
    patch: Partial<ListNavigationState> = {},
  ): Promise<void> => {
    save(patch)
    await router.push(to)
  }

  const restoreScroll = async (): Promise<void> => {
    await nextTick()
    requestAnimationFrame(() => window.scrollTo({ top: state.scrollY, behavior: 'auto' }))
  }

  return {
    navigateToDetail,
    restoreScroll,
    save,
    state,
  }
}
