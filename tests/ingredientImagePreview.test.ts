import assert from 'node:assert/strict'
import test from 'node:test'

import type { Ingredient, IngredientEnrichmentSuggestion } from '../src/types/recipe.ts'
import {
  ingredientDisplayMediaProfile,
  ingredientHasDisplayImage,
  withIngredientImageSuggestionPreview,
} from '../src/utils/ingredientImagePreview.ts'

const ingredient = {
  uuid: 'ingredient-one',
  name: 'Carotte',
  media_profile: {
    main_image_uri: null,
    image_status: 'missing',
    image_prompt: null,
    source: 'unknown',
    validated: false,
  },
} as Ingredient

test('shows the generated suggestion while keeping it unvalidated', () => {
  const suggestion = {
    proposed_patch: {
      media_profile: {
        main_image_uri: '/api/media/v1/carotte.png',
        image_status: 'generated',
        image_prompt: 'Une carotte',
        source: 'ai',
        validated: false,
      },
    },
  } as IngredientEnrichmentSuggestion

  const preview = withIngredientImageSuggestionPreview(ingredient, suggestion)

  assert.equal(preview.suggested_media_profile?.main_image_uri, '/api/media/v1/carotte.png')
  assert.equal(preview.suggested_media_profile?.image_status, 'generated')
  assert.equal(preview.suggested_media_profile?.source, 'ai')
  assert.equal(preview.suggested_media_profile?.validated, false)
  assert.equal(ingredient.media_profile.main_image_uri, null)
  assert.equal(ingredientDisplayMediaProfile(preview), preview.suggested_media_profile)
  assert.equal(ingredientHasDisplayImage(preview), true)
})

test('keeps the ingredient unchanged when the suggestion has no image', () => {
  const suggestion = { proposed_patch: { nutrition_profile: {} } } as IngredientEnrichmentSuggestion
  assert.equal(withIngredientImageSuggestionPreview(ingredient, suggestion), ingredient)
  assert.equal(ingredientHasDisplayImage(ingredient), false)
})

test('previews the image from a full enrichment without applying its other proposed fields', () => {
  const suggestion = {
    proposed_patch: {
      nutrition_profile: {
        kcal_per_100g: 41,
        nutri_score: 'A',
      },
      media_profile: {
        main_image_uri: '/api/media/v1/carotte-enrichie.png',
        image_status: 'generated',
        source: 'ai',
      },
    },
  } as IngredientEnrichmentSuggestion

  const preview = withIngredientImageSuggestionPreview(ingredient, suggestion)

  assert.equal(preview.suggested_media_profile?.main_image_uri, '/api/media/v1/carotte-enrichie.png')
  assert.equal(preview.suggested_media_profile?.validated, false)
  assert.equal(preview.nutrition_profile, ingredient.nutrition_profile)
})

test('keeps an attached image ahead of a pending suggestion', () => {
  const attachedIngredient = {
    ...ingredient,
    media_profile: {
      ...ingredient.media_profile,
      main_image_uri: '/api/media/v1/carotte-validee.png',
      image_status: 'uploaded',
      source: 'manual',
      validated: true,
    },
    suggested_media_profile: {
      ...ingredient.media_profile,
      main_image_uri: '/api/media/v1/carotte-suggeree.png',
      image_status: 'generated',
      source: 'ai',
      validated: false,
    },
  } as Ingredient

  assert.equal(
    ingredientDisplayMediaProfile(attachedIngredient).main_image_uri,
    '/api/media/v1/carotte-validee.png',
  )
})
