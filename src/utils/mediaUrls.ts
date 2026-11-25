const RECIPE_MEDIA_PATH_PREFIX = '/api/media/v1/buckets/'
const RELATIVE_URL_BASE = 'http://rekipe.local'

const isAbsoluteUrl = (value: string): boolean => /^[a-z][a-z\d+.-]*:\/\//i.test(value)

export const mediaCardImageUrl = (imageUrl?: string | null): string | null => {
  const value = imageUrl?.trim()
  if (!value) return null

  let parsed: URL
  try {
    parsed = new URL(value, RELATIVE_URL_BASE)
  } catch {
    return value
  }

  if (!parsed.pathname.startsWith(RECIPE_MEDIA_PATH_PREFIX)) return value

  parsed.searchParams.set('variant', 'card-v1')
  if (isAbsoluteUrl(value)) return parsed.toString()
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export const recipeCardImageUrl = mediaCardImageUrl
