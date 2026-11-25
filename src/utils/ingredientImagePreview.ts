import type {
  Ingredient,
  IngredientEnrichmentSuggestion,
  IngredientMediaProfile,
} from '@/types/recipe'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isImageStatus = (value: unknown): value is IngredientMediaProfile['image_status'] =>
  ['missing', 'generated', 'uploaded', 'rejected'].includes(String(value))

const isImageSource = (value: unknown): value is IngredientMediaProfile['source'] =>
  ['manual', 'ai', 'import', 'unknown'].includes(String(value))

/** Prefer an attached image; otherwise keep an unresolved suggestion visible across reloads. */
export const ingredientDisplayMediaProfile = (ingredient: Ingredient): IngredientMediaProfile => {
  if (ingredient.media_profile.main_image_uri?.trim()) return ingredient.media_profile
  return ingredient.suggested_media_profile ?? ingredient.media_profile
}

export const ingredientHasDisplayImage = (ingredient: Ingredient): boolean =>
  Boolean(ingredientDisplayMediaProfile(ingredient).main_image_uri?.trim())

/** Display a generated-but-unvalidated image immediately without applying its suggestion. */
export const withIngredientImageSuggestionPreview = (
  ingredient: Ingredient,
  suggestion: IngredientEnrichmentSuggestion | undefined,
): Ingredient => {
  const proposedProfile = suggestion?.proposed_patch.media_profile
  if (!isRecord(proposedProfile)) return ingredient

  const imageUri = proposedProfile.main_image_uri
  if (typeof imageUri !== 'string' || !imageUri.trim()) return ingredient

  return {
    ...ingredient,
    suggested_media_profile: {
      ...ingredient.suggested_media_profile,
      main_image_uri: imageUri.trim(),
      image_status: isImageStatus(proposedProfile.image_status)
        ? proposedProfile.image_status
        : 'generated',
      image_prompt: typeof proposedProfile.image_prompt === 'string'
        ? proposedProfile.image_prompt
        : ingredient.media_profile.image_prompt,
      source: isImageSource(proposedProfile.source) ? proposedProfile.source : 'ai',
      validated: false,
    },
  }
}
