import type { IngredientEnrichmentRunResult } from '@/types/recipe'

export const ingredientRunProposedImage = (
  run: IngredientEnrichmentRunResult,
): boolean => run.proposed_fields.includes('media_profile')
