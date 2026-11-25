import type { IngredientEnrichmentRunResult } from '@/types/recipe'

const CONTENT_FIELDS = new Set([
  'seasonality_profile',
  'nutrition_profile',
  'sustainability_profile',
  'allergen_profile',
  'unit_profile',
  'package_profiles',
  'substitution_profile',
  'enrichment_profile',
])

/** Keep the completion action strictly scoped to ingredient data, never media. */
export const ingredientContentSuggestionFields = (
  run: IngredientEnrichmentRunResult,
): string[] => run.proposed_fields.filter((field) => CONTENT_FIELDS.has(field))

export const ingredientRunProposedImage = (
  run: IngredientEnrichmentRunResult,
): boolean => run.proposed_fields.includes('media_profile')
