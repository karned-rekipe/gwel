import assert from 'node:assert/strict'
import test from 'node:test'

import type { IngredientEnrichmentRunResult } from '../src/types/recipe.ts'
import { ingredientRunProposedImage } from '../src/utils/ingredientEnrichment.ts'

const run = (proposedFields: string[]): IngredientEnrichmentRunResult => ({
  run_uuid: 'run-one',
  ingredient_uuid: 'ingredient-one',
  suggestion_uuid: 'suggestion-one',
  status: 'success',
  completeness_score: 25,
  missing_fields: proposedFields,
  proposed_fields: proposedFields,
  image_generated: proposedFields.includes('media_profile'),
  warnings: [],
})

test('completion reports when its applied patch contains an image', () => {
  const result = run(['media_profile', 'nutrition_profile', 'enrichment_profile'])

  assert.equal(ingredientRunProposedImage(result), true)
})

test('completion reports when no image was generated', () => {
  assert.equal(ingredientRunProposedImage(run(['nutrition_profile'])), false)
})
