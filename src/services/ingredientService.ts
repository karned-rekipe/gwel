import { appConfig } from '@/config/env'
import { createHttpClient, unwrapApiResponse, unwrapPaginatedResponse } from '@/services/http'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  DuplicateGroup,
  DuplicateMergePayload,
  DuplicateMergeResult,
  Ingredient,
  IngredientEnrichmentSuggestion,
  IngredientEnrichmentSuggestionActionPayload,
  IngredientPayload,
  Recipe,
} from '@/types/recipe'

const ingredientApi = createHttpClient(`${appConfig.services.recipeApiBaseUrl}/v1`)

function defaultMediaProfile(): Ingredient['media_profile'] {
  return { main_image_uri: null, image_status: 'missing', image_prompt: null, source: 'unknown', validated: false }
}

function defaultSeasonalityProfile(): Ingredient['seasonality_profile'] {
  return { availability_type: 'unknown', months: {}, geography: null, source: 'unknown', confidence: null, validated: false }
}

function defaultNutritionProfile(): Ingredient['nutrition_profile'] {
  return {
    kcal_per_100g: null,
    kcal_per_100ml: null,
    nutri_score: 'unknown',
    ciqual_code: null,
    source: 'unknown',
    confidence: null,
    validated: false,
  }
}

function defaultSustainabilityProfile(): Ingredient['sustainability_profile'] {
  return {
    carbon_kg_co2e_per_kg: null,
    agribalyse_code: null,
    environmental_score: null,
    source: 'unknown',
    confidence: null,
    validated: false,
  }
}

function defaultAllergenProfile(): Ingredient['allergen_profile'] {
  return { allergens: [], source: 'unknown', confidence: null, validated: false }
}

function defaultUnitProfile(): Ingredient['unit_profile'] {
  return {
    reference_unit: 'unknown',
    default_purchase_unit: null,
    default_recipe_unit: null,
    allowed_units: [],
    conversions: [],
  }
}

function defaultSubstitutionProfile(): Ingredient['substitution_profile'] {
  return {
    default_policy: 'unknown',
    substitute_ingredient_uuids: [],
    notes: null,
    source: 'unknown',
    confidence: null,
    validated: false,
  }
}

function defaultEnrichmentProfile(): Ingredient['enrichment_profile'] {
  return {
    completeness_score: 0,
    status: 'missing',
    missing_fields: [
      'media_profile',
      'seasonality_profile',
      'nutrition_profile',
      'sustainability_profile',
      'allergen_profile',
      'unit_profile',
      'package_profiles',
      'substitution_profile',
    ],
    last_run_uuid: null,
    last_enriched_at: null,
    validated_fields: [],
    rejected_fields: [],
  }
}

function normalizeIngredient(ingredient: Ingredient): Ingredient {
  const allergenProfile = { ...defaultAllergenProfile(), ...(ingredient.allergen_profile ?? {}) }
  const unitProfile = { ...defaultUnitProfile(), ...(ingredient.unit_profile ?? {}) }
  const enrichmentProfile = { ...defaultEnrichmentProfile(), ...(ingredient.enrichment_profile ?? {}) }
  return {
    ...ingredient,
    secondary_supplier_uuids: ingredient.secondary_supplier_uuids ?? [],
    season_months: ingredient.season_months ?? {},
    media_profile: { ...defaultMediaProfile(), ...(ingredient.media_profile ?? {}) },
    seasonality_profile: { ...defaultSeasonalityProfile(), ...(ingredient.seasonality_profile ?? {}) },
    nutrition_profile: { ...defaultNutritionProfile(), ...(ingredient.nutrition_profile ?? {}) },
    sustainability_profile: { ...defaultSustainabilityProfile(), ...(ingredient.sustainability_profile ?? {}) },
    allergen_profile: { ...allergenProfile, allergens: allergenProfile.allergens ?? [] },
    unit_profile: {
      ...unitProfile,
      allowed_units: unitProfile.allowed_units ?? [],
      conversions: unitProfile.conversions ?? [],
    },
    package_profiles: ingredient.package_profiles ?? [],
    substitution_profile: { ...defaultSubstitutionProfile(), ...(ingredient.substitution_profile ?? {}) },
    enrichment_profile: {
      ...enrichmentProfile,
      missing_fields: enrichmentProfile.missing_fields ?? [],
      validated_fields: enrichmentProfile.validated_fields ?? [],
      rejected_fields: enrichmentProfile.rejected_fields ?? [],
    },
  }
}

export const ingredientService = {
  async getPage(params: {
    name?: string
    group_uuid?: string
    rayon_uuid?: string
    page?: number
    per_page?: number
  } = {}): Promise<PaginatedResponse<Ingredient>> {
    const response = await ingredientApi.get<PaginatedResponse<Ingredient>>('/ingredients/', {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 50,
        ...(params.name ? { name: params.name } : {}),
        ...(params.group_uuid ? { group_uuid: params.group_uuid } : {}),
        ...(params.rayon_uuid ? { rayon_uuid: params.rayon_uuid } : {}),
      },
    })
    return {
      ...response.data,
      data: response.data.data.map(normalizeIngredient),
    }
  },

  async getAll(name?: string, perPage = 100): Promise<Ingredient[]> {
    const response = await ingredientApi.get<PaginatedResponse<Ingredient>>('/ingredients/', {
      params: {
        per_page: perPage,
        ...(name ? { name } : {}),
      },
    })
    return unwrapPaginatedResponse(response.data).map(normalizeIngredient)
  },

  async getByUuid(uuid: string): Promise<Ingredient> {
    const response = await ingredientApi.get<ApiResponse<Ingredient>>(`/ingredients/${uuid}`, {
      headers: { 'Cache-Control': 'no-cache' },
      params: { _cache: Date.now() },
    })
    return normalizeIngredient(unwrapApiResponse(response.data))
  },

  async getRecipes(uuid: string): Promise<Recipe[]> {
    const response = await ingredientApi.get<PaginatedResponse<Recipe>>(`/ingredients/${uuid}/recipes`)
    return unwrapPaginatedResponse(response.data)
  },

  async create(payload: IngredientPayload): Promise<Ingredient> {
    const response = await ingredientApi.post<ApiResponse<Ingredient>>('/ingredients/', payload, {
      headers: { Prefer: 'return=representation' },
    })
    return normalizeIngredient(unwrapApiResponse(response.data))
  },

  async update(uuid: string, payload: Partial<IngredientPayload>): Promise<void> {
    await ingredientApi.patch(`/ingredients/${uuid}`, payload)
  },

  async listEnrichmentSuggestions(uuid: string): Promise<IngredientEnrichmentSuggestion[]> {
    const response = await ingredientApi.get<ApiResponse<IngredientEnrichmentSuggestion[]>>(
      `/ingredients/${uuid}/enrichment-suggestions`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _cache: Date.now() },
      },
    )
    return unwrapApiResponse(response.data)
  },

  async applyEnrichmentSuggestion(
    uuid: string,
    suggestionUuid: string,
    payload: IngredientEnrichmentSuggestionActionPayload,
  ): Promise<IngredientEnrichmentSuggestion> {
    const response = await ingredientApi.post<ApiResponse<IngredientEnrichmentSuggestion>>(
      `/ingredients/${uuid}/enrichment-suggestions/${suggestionUuid}/apply`,
      payload,
    )
    return unwrapApiResponse(response.data)
  },

  async rejectEnrichmentSuggestion(
    uuid: string,
    suggestionUuid: string,
    payload: IngredientEnrichmentSuggestionActionPayload = {},
  ): Promise<IngredientEnrichmentSuggestion> {
    const response = await ingredientApi.post<ApiResponse<IngredientEnrichmentSuggestion>>(
      `/ingredients/${uuid}/enrichment-suggestions/${suggestionUuid}/reject`,
      payload,
    )
    return unwrapApiResponse(response.data)
  },

  async delete(uuid: string): Promise<void> {
    await ingredientApi.delete(`/ingredients/${uuid}`)
  },

  async getDuplicates(): Promise<DuplicateGroup[]> {
    const response = await ingredientApi.get<ApiResponse<DuplicateGroup[]>>('/ingredients/duplicates')
    return unwrapApiResponse(response.data)
  },

  async mergeDuplicates(payload: DuplicateMergePayload): Promise<DuplicateMergeResult> {
    const response = await ingredientApi.post<ApiResponse<DuplicateMergeResult>>('/ingredients/duplicates/merge', payload)
    return unwrapApiResponse(response.data)
  },
}
