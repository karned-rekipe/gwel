export interface RecipeLayerIdentity {
  uuid: string
  name: string
}

export interface RecipeLayerSession {
  uuid: string
  title: string
}

export interface RecipeLayersState {
  sessions: RecipeLayerSession[]
  activeUuid: string | null
}

export const createRecipeLayersState = (): RecipeLayersState => ({
  sessions: [],
  activeUuid: null,
})

const recipeLayerTitle = (name: string): string => name.trim() || 'Recette'

export const openRecipeLayer = (
  state: RecipeLayersState,
  recipe: RecipeLayerIdentity,
): RecipeLayersState => {
  const existingSession = state.sessions.some((session) => session.uuid === recipe.uuid)
  const nextSession = {
    uuid: recipe.uuid,
    title: recipeLayerTitle(recipe.name),
  }

  return {
    sessions: existingSession
      ? state.sessions.map((session) => (session.uuid === recipe.uuid ? nextSession : session))
      : [...state.sessions, nextSession],
    activeUuid: recipe.uuid,
  }
}

export const restoreRecipeLayer = (
  state: RecipeLayersState,
  uuid: string,
): RecipeLayersState => ({
  ...state,
  activeUuid: state.sessions.some((session) => session.uuid === uuid)
    ? uuid
    : state.activeUuid,
})

export const minimizeRecipeLayer = (
  state: RecipeLayersState,
  uuid: string,
): RecipeLayersState => ({
  ...state,
  activeUuid: state.activeUuid === uuid ? null : state.activeUuid,
})

export const closeRecipeLayer = (
  state: RecipeLayersState,
  uuid: string,
): RecipeLayersState => ({
  sessions: state.sessions.filter((session) => session.uuid !== uuid),
  activeUuid: state.activeUuid === uuid ? null : state.activeUuid,
})

export const renameRecipeLayer = (
  state: RecipeLayersState,
  uuid: string,
  title: string,
): RecipeLayersState => ({
  ...state,
  sessions: state.sessions.map((session) => (
    session.uuid === uuid
      ? { ...session, title: recipeLayerTitle(title) }
      : session
  )),
})
