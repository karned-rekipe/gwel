export type ResourceLayerKind = 'recipe' | 'ingredient' | 'equipment'

export interface ResourceLayerIdentity {
  uuid: string
  name: string
  kind: ResourceLayerKind
}

export interface ResourceLayerSession {
  key: string
  uuid: string
  kind: ResourceLayerKind
  title: string
}

export interface ResourceLayersState {
  sessions: ResourceLayerSession[]
  activeKey: string | null
}

export const createResourceLayersState = (): ResourceLayersState => ({
  sessions: [],
  activeKey: null,
})

export const resourceLayerKey = (kind: ResourceLayerKind, uuid: string): string => `${kind}:${uuid}`

const fallbackTitles: Record<ResourceLayerKind, string> = {
  recipe: 'Recette',
  ingredient: 'Ingrédient',
  equipment: 'Équipement',
}

const resourceLayerTitle = (kind: ResourceLayerKind, name: string): string =>
  name.trim() || fallbackTitles[kind]

export const openResourceLayer = (
  state: ResourceLayersState,
  resource: ResourceLayerIdentity,
): ResourceLayersState => {
  const key = resourceLayerKey(resource.kind, resource.uuid)
  const nextSession: ResourceLayerSession = {
    key,
    uuid: resource.uuid,
    kind: resource.kind,
    title: resourceLayerTitle(resource.kind, resource.name),
  }

  return {
    sessions: state.sessions.some((session) => session.key === key)
      ? state.sessions.map((session) => (session.key === key ? nextSession : session))
      : [...state.sessions, nextSession],
    activeKey: key,
  }
}

export const restoreResourceLayer = (
  state: ResourceLayersState,
  key: string,
): ResourceLayersState => ({
  ...state,
  activeKey: state.sessions.some((session) => session.key === key) ? key : state.activeKey,
})

export const minimizeResourceLayer = (
  state: ResourceLayersState,
  key: string,
): ResourceLayersState => ({
  ...state,
  activeKey: state.activeKey === key ? null : state.activeKey,
})

export const closeResourceLayer = (
  state: ResourceLayersState,
  key: string,
): ResourceLayersState => ({
  sessions: state.sessions.filter((session) => session.key !== key),
  activeKey: state.activeKey === key ? null : state.activeKey,
})

export const renameResourceLayer = (
  state: ResourceLayersState,
  key: string,
  title: string,
): ResourceLayersState => ({
  ...state,
  sessions: state.sessions.map((session) => (
    session.key === key
      ? { ...session, title: resourceLayerTitle(session.kind, title) }
      : session
  )),
})
