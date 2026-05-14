export interface RecipeSource {
  name: string
  description?: string | null
  uri?: string | null
}

export interface Ingredient {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  rayon_uuid?: string | null
  group_uuid?: string | null
  main_supplier_uuid?: string | null
  secondary_supplier_uuids: string[]
  rayon?: IngredientRayon | null
  group?: IngredientGroup | null
  green_score?: number | null
  unit?: string | null
  quantity?: number | null
  season_months: Record<number, number>
  media_profile: IngredientMediaProfile
  seasonality_profile: IngredientSeasonalityProfile
  nutrition_profile: IngredientNutritionProfile
  sustainability_profile: IngredientSustainabilityProfile
  allergen_profile: IngredientAllergenProfile
  unit_profile: IngredientUnitProfile
  package_profiles: IngredientPackageProfile[]
  substitution_profile: IngredientSubstitutionProfile
  enrichment_profile: IngredientEnrichmentProfile
}

export interface IngredientPayload {
  name: string
  rayon_uuid?: string | null
  group_uuid?: string | null
  main_supplier_uuid?: string | null
  secondary_supplier_uuids?: string[]
  green_score?: number | null
  unit?: string | null
  quantity?: number | null
  season_months: Record<number, number>
  media_profile?: IngredientMediaProfile
  seasonality_profile?: IngredientSeasonalityProfile
  nutrition_profile?: IngredientNutritionProfile
  sustainability_profile?: IngredientSustainabilityProfile
  allergen_profile?: IngredientAllergenProfile
  unit_profile?: IngredientUnitProfile
  package_profiles?: IngredientPackageProfile[]
  substitution_profile?: IngredientSubstitutionProfile
  enrichment_profile?: IngredientEnrichmentProfile
}

export interface IngredientMediaProfile {
  main_image_uri?: string | null
  image_status: 'missing' | 'generated' | 'uploaded' | 'rejected'
  image_prompt?: string | null
  source: 'manual' | 'ai' | 'import' | 'unknown'
  validated: boolean
}

export interface IngredientSeasonalityProfile {
  availability_type: 'unknown' | 'year_round' | 'seasonal' | 'not_applicable'
  months: Record<number, number>
  geography?: string | null
  source: 'manual' | 'dataset' | 'ai' | 'import' | 'legacy_hint' | 'unknown'
  confidence?: number | null
  validated: boolean
}

export interface IngredientNutritionProfile {
  kcal_per_100g?: number | null
  kcal_per_100ml?: number | null
  nutri_score: 'A' | 'B' | 'C' | 'D' | 'E' | 'not_applicable' | 'unknown'
  ciqual_code?: string | null
  source: 'manual' | 'ciqual' | 'openfoodfacts' | 'ai' | 'import' | 'unknown'
  confidence?: number | null
  validated: boolean
}

export interface IngredientSustainabilityProfile {
  carbon_kg_co2e_per_kg?: number | null
  agribalyse_code?: string | null
  environmental_score?: number | null
  source: 'manual' | 'agribalyse' | 'openfoodfacts' | 'ai' | 'import' | 'unknown'
  confidence?: number | null
  validated: boolean
}

export interface IngredientAllergen {
  code:
    | 'gluten'
    | 'crustaceans'
    | 'eggs'
    | 'fish'
    | 'peanuts'
    | 'soy'
    | 'milk'
    | 'nuts'
    | 'celery'
    | 'mustard'
    | 'sesame'
    | 'sulphites'
    | 'lupin'
    | 'molluscs'
  presence: 'contains' | 'may_contain' | 'absent' | 'unknown'
  note?: string | null
}

export interface IngredientAllergenProfile {
  allergens: IngredientAllergen[]
  source: 'manual' | 'regulation' | 'openfoodfacts' | 'ai' | 'import' | 'unknown'
  confidence?: number | null
  validated: boolean
}

export interface IngredientUnitConversion {
  from_unit: string
  to_unit: string
  factor: number
  source: 'global' | 'ingredient_specific' | 'package_profile'
  confidence?: number | null
}

export interface IngredientUnitProfile {
  reference_unit: 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'piece' | 'serving' | 'unknown'
  default_purchase_unit?: string | null
  default_recipe_unit?: string | null
  allowed_units: string[]
  conversions: IngredientUnitConversion[]
}

export interface IngredientPackageProfile {
  label: string
  package_unit: 'paquet' | 'bouteille' | 'boite' | 'barquette' | 'piece' | 'custom'
  net_quantity: number
  net_unit: 'g' | 'ml' | 'piece'
  servings_count?: number | null
  serving_label?: string | null
  serving_quantity?: number | null
  serving_unit?: 'g' | 'ml' | 'piece' | null
  source: 'manual' | 'ai' | 'import' | 'supplier' | 'unknown'
  validated: boolean
}

export interface IngredientSubstitutionProfile {
  default_policy: 'unknown' | 'substitutable' | 'essential_by_default'
  substitute_ingredient_uuids: string[]
  notes?: string | null
  source: 'manual' | 'ai' | 'import' | 'unknown'
  confidence?: number | null
  validated: boolean
}

export interface IngredientEnrichmentProfile {
  completeness_score: number
  status: 'missing' | 'partial' | 'suggested' | 'validated' | 'rejected'
  missing_fields: string[]
  last_run_uuid?: string | null
  last_enriched_at?: string | null
  validated_fields: string[]
  rejected_fields: string[]
}

export type IngredientEnrichmentSuggestionStatus =
  | 'pending'
  | 'partially_applied'
  | 'applied'
  | 'rejected'
  | 'expired'

export interface IngredientEnrichmentSuggestion {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  ingredient_uuid: string
  run_uuid: string
  status: IngredientEnrichmentSuggestionStatus
  proposed_patch: Record<string, unknown>
  field_confidences: Record<string, number>
  field_sources: Record<string, string>
  applied_fields: string[]
  rejected_fields: string[]
  reasoning_summary: string
  applied_at?: string | null
  rejected_at?: string | null
}

export interface IngredientEnrichmentSuggestionActionPayload {
  fields?: string[] | null
  force?: boolean
}

export interface IngredientEnrichmentRunResult {
  run_uuid: string
  ingredient_uuid: string
  suggestion_uuid?: string | null
  status: string
  completeness_score: number
  missing_fields: string[]
  proposed_fields: string[]
  error?: string | null
}

export type IngredientEnrichmentRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'

export interface IngredientEnrichmentRun {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  ingredient_uuid: string
  status: IngredientEnrichmentRunStatus
  suggestion_uuid?: string | null
  proposed_fields: string[]
  error?: string | null
  started_at?: string | null
  completed_at?: string | null
  metadata: Record<string, unknown>
}

export interface IngredientGroup {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  slug: string
  description?: string | null
  sort_order: number
}

export interface IngredientRayon {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  slug: string
  description?: string | null
  sort_order: number
}

export interface IngredientSettingPayload {
  name: string
  slug?: string | null
  description?: string | null
  sort_order?: number
}

export type TagCategory = 'diet' | 'occasion' | 'service' | 'technique' | 'other'

export interface Tag {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  slug: string
  category: TagCategory
  color?: string | null
}

export interface TagPayload {
  name: string
  slug?: string | null
  category: TagCategory
  color?: string | null
}

export interface Equipment {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  description?: string | null
}

export interface EquipmentPayload {
  name: string
  description?: string | null
}

export interface DuplicateItem {
  uuid: string
  name: string
}

export interface DuplicateGroup {
  normalized_name: string
  items: DuplicateItem[]
}

export interface DuplicateMergePayload {
  target_uuid: string
  duplicate_uuids: string[]
}

export interface DuplicateMergeResult {
  target_uuid: string
  merged_uuids: string[]
  updated_recipe_count: number
  deleted_count: number
}

export interface RecipeIngredient {
  ingredient_uuid: string
  name: string
  quantity: number
  unit: string
  season_months: Record<number, number>
  rayon_uuid?: string | null
  group_uuid?: string | null
  main_supplier_uuid?: string | null
  secondary_supplier_uuids?: string[]
  rayon?: IngredientRayon | null
  group?: IngredientGroup | null
  green_score?: number | null
  component_uuid?: string | null
  source_recipe_uuid?: string | null
  line_origin?: 'manual' | 'component_projection'
}

export interface RecipeEquipment {
  equipment_uuid: string
  name: string
  quantity?: number | null
}

export interface RecipeStep {
  uuid?: string
  name: string
  description?: string | null
  cooking_time?: number | null
  rest_time?: number | null
  preparation_time?: number | null
  main_image?: string | null
  secondary_images: string[]
  rank: number
  total_time?: number
  component_uuid?: string | null
  source_recipe_uuid?: string | null
  line_origin?: 'manual' | 'component_projection'
}

export interface RecipeComponent {
  uuid: string
  recipe_uuid: string
  label: string
  rank: number
  servings_multiplier: number
  recipe_name?: string | null
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
}

export type RecipeStatus = 'draft' | 'active' | 'archived'

export type RecipeQualityStatus = 'minimal' | 'text_only' | 'structured' | 'validated'

export type RecipeMigrationMetadata = Record<string, string | number | boolean | null>

export interface Recipe {
  uuid: string
  version: number
  created_at?: string
  updated_at?: string
  name: string
  description?: string | null
  origin_country?: string | null
  servings?: number | null
  unit_count?: number | null
  difficulty?: number | null
  price?: number | null
  main_image?: string | null
  secondary_images: string[]
  favorite: boolean
  tag_uuids: string[]
  tags: Tag[]
  season_months: Record<number, number>
  status: RecipeStatus
  quality_status: RecipeQualityStatus
  legacy_id?: number | null
  created_at_legacy?: string | null
  updated_at_legacy?: string | null
  migration_metadata: RecipeMigrationMetadata
  sources: RecipeSource[]
  components: RecipeComponent[]
  ingredients: RecipeIngredient[]
  equipment: RecipeEquipment[]
  steps: RecipeStep[]
}

export interface RecipeCreatedResponse {
  uuid: string
}

export interface RecipeFormIngredient {
  ingredientUuid: string
  search: string
  quantity: string
  unit: string
}

export interface RecipeFormEquipment {
  equipmentUuid: string
  search: string
  quantity: string
}

export interface RecipeFormStep {
  name: string
  description: string
  preparationTime: string
  cookingTime: string
  restTime: string
}

export interface RecipeFormComponent {
  uuid?: string
  recipeUuid: string
  search: string
  label: string
  servingsMultiplier: string
}

export interface RecipeFormSource {
  name: string
  description: string
  uri: string
}

export interface RecipeFormData {
  name: string
  description: string
  servings: string
  unitCount: string
  originCountry: string
  difficulty: string
  price: string
  favorite: boolean
  tagUuids: string[]
  mainImage: string
  secondaryImages: string
  ingredients: RecipeFormIngredient[]
  components: RecipeFormComponent[]
  equipment: RecipeFormEquipment[]
  steps: RecipeFormStep[]
  sources: RecipeFormSource[]
}

export interface RecipeCreatePayload {
  name: string
  description?: string | null
  origin_country?: string | null
  servings: number
  unit_count?: number | null
  difficulty?: number | null
  price?: number | null
  main_image?: string | null
  secondary_images: string[]
  favorite?: boolean
  tag_uuids?: string[]
  status?: RecipeStatus
  quality_status?: RecipeQualityStatus
  legacy_id?: number | null
  created_at_legacy?: string | null
  updated_at_legacy?: string | null
  migration_metadata?: RecipeMigrationMetadata
  sources: RecipeSource[]
  components?: Array<{
    uuid?: string | null
    recipe_uuid: string
    label: string
    rank: number
    servings_multiplier: number
  }>
  ingredients: Array<{
    ingredient_uuid: string
    quantity: number
    unit: string
  }>
  equipment: Array<{
    equipment_uuid: string
    quantity?: number | null
  }>
  steps: RecipeStep[]
}

export interface CreateRecipeWithAIDTO {
  raw_text: string
  allow_duplicate?: boolean
}

export interface AICreateResponse {
  recipe_uuid: string
  recipe_name: string
  formatted_response: string
  created: boolean
  duplicate_confirmation_required: boolean
  existing_recipe_uuid?: string | null
  existing_recipe_name?: string | null
}
