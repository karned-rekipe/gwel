import assert from 'node:assert/strict'
import test from 'node:test'

import type { IngredientEnrichmentRunResult } from '../src/types/recipe.ts'
import {
  ingredientContentSuggestionFields,
  ingredientRunProposedImage,
} from '../src/utils/ingredientEnrichment.ts'

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

test('completion applies content fields but never the image field', () => {
  const result = run(['media_profile', 'nutrition_profile', 'enrichment_profile'])

  assert.deepEqual(
    ingredientContentSuggestionFields(result),
    ['nutrition_profile', 'enrichment_profile'],
  )
  assert.equal(ingredientRunProposedImage(result), true)
})

test('completion ignores fields outside the ingredient content contract', () => {
  assert.deepEqual(ingredientContentSuggestionFields(run(['name', 'unknown_field'])), [])
})
