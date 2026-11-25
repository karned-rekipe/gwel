export interface EntityWithUuid {
  uuid: string
}

export const replaceEntityByUuid = <T extends EntityWithUuid>(items: T[], updated: T): T[] =>
  items.map((item) => item.uuid === updated.uuid ? updated : item)

export const upsertEntityByUuid = <T extends EntityWithUuid>(items: T[], updated: T): T[] =>
  items.some((item) => item.uuid === updated.uuid)
    ? replaceEntityByUuid(items, updated)
    : [updated, ...items]

export const removeEntityByUuid = <T extends EntityWithUuid>(items: T[], uuid: string): T[] =>
  items.filter((item) => item.uuid !== uuid)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Replace one entity inside the collection shapes used by TanStack Query:
 * a plain array, a paginated response, or an infinite-query response.
 */
export const replaceEntityInCachedCollection = <T extends EntityWithUuid>(
  cached: unknown,
  updated: T,
): unknown => {
  if (Array.isArray(cached)) {
    return cached.map((item) =>
      isRecord(item) && item.uuid === updated.uuid ? updated : item,
    )
  }

  if (!isRecord(cached)) return cached

  if (Array.isArray(cached.data)) {
    return {
      ...cached,
      data: replaceEntityInCachedCollection(cached.data, updated),
    }
  }

  if (Array.isArray(cached.pages)) {
    return {
      ...cached,
      pages: cached.pages.map((page) => replaceEntityInCachedCollection(page, updated)),
    }
  }

  return cached
}
