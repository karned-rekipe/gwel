<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import type {
  Ingredient,
  IngredientAllergen,
  IngredientAllergenProfile,
  IngredientEnrichmentProfile,
  IngredientMediaProfile,
  IngredientNutritionProfile,
  IngredientPackageProfile,
  IngredientPayload,
  IngredientSeasonalityProfile,
  IngredientSubstitutionProfile,
  IngredientSustainabilityProfile,
  IngredientUnitConversion,
  IngredientUnitProfile,
} from '@/types/recipe'

const props = defineProps<{
  ingredient: Ingredient
  isSaving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  save: [payload: Partial<IngredientPayload>]
}>()

const mediaStatuses = ['missing', 'generated', 'uploaded', 'rejected'] as const
const mediaSources = ['manual', 'ai', 'import', 'unknown'] as const
const availabilityTypes = ['unknown', 'year_round', 'seasonal', 'not_applicable'] as const
const seasonalitySources = ['manual', 'dataset', 'ai', 'import', 'legacy_hint', 'unknown'] as const
const nutriScores = ['A', 'B', 'C', 'D', 'E', 'not_applicable', 'unknown'] as const
const nutritionSources = ['manual', 'ciqual', 'openfoodfacts', 'ai', 'import', 'unknown'] as const
const sustainabilitySources = ['manual', 'agribalyse', 'openfoodfacts', 'ai', 'import', 'unknown'] as const
const allergenSources = ['manual', 'regulation', 'openfoodfacts', 'ai', 'import', 'unknown'] as const
const allergenCodes = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const
const allergenPresences = ['contains', 'may_contain', 'absent', 'unknown'] as const
const referenceUnits = ['g', 'kg', 'ml', 'cl', 'l', 'piece', 'serving', 'unknown'] as const
const packageUnits = ['paquet', 'bouteille', 'boite', 'barquette', 'piece', 'custom'] as const
const netUnits = ['g', 'ml', 'piece'] as const
const substitutionPolicies = ['unknown', 'substitutable', 'essential_by_default'] as const
const enrichmentStatuses = ['missing', 'partial', 'suggested', 'validated', 'rejected'] as const

type MediaStatus = typeof mediaStatuses[number]
type MediaSource = typeof mediaSources[number]
type AvailabilityType = typeof availabilityTypes[number]
type SeasonalitySource = typeof seasonalitySources[number]
type NutriScore = typeof nutriScores[number]
type NutritionSource = typeof nutritionSources[number]
type SustainabilitySource = typeof sustainabilitySources[number]
type AllergenSource = typeof allergenSources[number]
type AllergenCode = typeof allergenCodes[number]
type AllergenPresence = typeof allergenPresences[number]
type ReferenceUnit = typeof referenceUnits[number]
type PackageUnit = typeof packageUnits[number]
type NetUnit = typeof netUnits[number]
type SubstitutionPolicy = typeof substitutionPolicies[number]
type EnrichmentStatus = typeof enrichmentStatuses[number]

const form = reactive({
  mediaImageUri: '',
  mediaImageStatus: 'missing' as MediaStatus,
  mediaImagePrompt: '',
  mediaSource: 'unknown' as MediaSource,
  mediaValidated: false,
  seasonalityAvailabilityType: 'unknown' as AvailabilityType,
  seasonalityMonths: '',
  seasonalityGeography: '',
  seasonalitySource: 'unknown' as SeasonalitySource,
  seasonalityConfidence: '',
  seasonalityValidated: false,
  kcalPer100g: '',
  kcalPer100ml: '',
  nutriScore: 'unknown' as NutriScore,
  ciqualCode: '',
  nutritionSource: 'unknown' as NutritionSource,
  nutritionConfidence: '',
  nutritionValidated: false,
  carbonKgCo2ePerKg: '',
  agribalyseCode: '',
  environmentalScore: '',
  sustainabilitySource: 'unknown' as SustainabilitySource,
  sustainabilityConfidence: '',
  sustainabilityValidated: false,
  allergens: '',
  allergenSource: 'unknown' as AllergenSource,
  allergenConfidence: '',
  allergenValidated: false,
  referenceUnit: 'unknown' as ReferenceUnit,
  defaultPurchaseUnit: '',
  defaultRecipeUnit: '',
  allowedUnits: '',
  conversions: '',
  packages: '',
  substitutionPolicy: 'unknown' as SubstitutionPolicy,
  substituteIngredientUuids: '',
  substitutionNotes: '',
  substitutionSource: 'unknown' as MediaSource,
  substitutionConfidence: '',
  substitutionValidated: false,
  completenessScore: '',
  enrichmentStatus: 'missing' as EnrichmentStatus,
  missingFields: '',
  validatedFields: '',
  rejectedFields: '',
})
const formError = ref('')

function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value)
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function confidenceOrNull(value: string): number | null {
  const parsed = numberOrNull(value)
  if (parsed === null) return null
  if (parsed > 1) return Math.round((parsed / 100) * 1000) / 1000
  return parsed
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatMonths(months: Record<number, number>): string {
  return Object.entries(months)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([month, score]) => `${month}:${score}`)
    .join(', ')
}

function parseMonths(value: string): Record<number, number> | null {
  const months: Record<number, number> = {}
  for (const token of splitList(value)) {
    const separator = token.includes(':') ? ':' : '='
    const [monthText, scoreText] = token.split(separator).map((part) => part.trim())
    if (!monthText || !scoreText) return null
    const month = Number(monthText)
    const score = Number(scoreText)
    if (!Number.isInteger(month) || month < 1 || month > 12) return null
    if (!Number.isInteger(score) || score < 1 || score > 3) return null
    months[month] = score
  }
  return months
}

function formatAllergens(allergens: IngredientAllergen[]): string {
  return allergens
    .map((allergen) => [allergen.code, allergen.presence, allergen.note].filter(Boolean).join(':'))
    .join('\n')
}

function parseAllergens(value: string): IngredientAllergen[] | null {
  const result: IngredientAllergen[] = []
  for (const token of splitList(value)) {
    const [code, presence = 'unknown', ...noteParts] = token.split(':').map((part) => part.trim())
    if (!code || !isOneOf(code, allergenCodes) || !isOneOf(presence, allergenPresences)) return null
    result.push({
      code: code as AllergenCode,
      presence: presence as AllergenPresence,
      note: nullable(noteParts.join(':')),
    })
  }
  return result
}

function formatConversions(conversions: IngredientUnitConversion[]): string {
  return conversions
    .map((conversion) => `${conversion.from_unit}>${conversion.to_unit}=${conversion.factor}`)
    .join('\n')
}

function parseConversions(value: string): IngredientUnitConversion[] | null {
  const result: IngredientUnitConversion[] = []
  for (const token of splitList(value)) {
    let fromUnit = ''
    let toUnit = ''
    let factorText = ''
    if (token.includes('>') && token.includes('=')) {
      const parts = token.split('=').map((part) => part.trim())
      if (parts.length !== 2 || !parts[0] || !parts[1]) return null
      const sourceParts = parts[0].split('>').map((part) => part.trim())
      if (sourceParts.length !== 2 || !sourceParts[0] || !sourceParts[1]) return null
      fromUnit = sourceParts[0]
      toUnit = sourceParts[1]
      factorText = parts[1]
    } else {
      const parts = token.split(':').map((part) => part.trim())
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null
      fromUnit = parts[0]
      toUnit = parts[1]
      factorText = parts[2]
    }
    const factor = Number(factorText.replace(',', '.'))
    if (!fromUnit || !toUnit || !Number.isFinite(factor) || factor <= 0) return null
    result.push({ from_unit: fromUnit, to_unit: toUnit, factor, source: 'ingredient_specific' })
  }
  return result
}

function formatPackages(packages: IngredientPackageProfile[]): string {
  return packages
    .map((item) =>
      [
        item.label,
        item.package_unit,
        item.net_quantity,
        item.net_unit,
        item.servings_count ?? '',
        item.serving_label ?? '',
        item.serving_quantity ?? '',
        item.serving_unit ?? '',
      ].join('|'),
    )
    .join('\n')
}

function parsePackages(value: string): IngredientPackageProfile[] | null {
  const result: IngredientPackageProfile[] = []
  for (const token of splitList(value)) {
    const parts = token.split('|').map((part) => part.trim())
    if (parts.length < 4) return null
    const label = parts[0] ?? ''
    const packageUnit = parts[1] ?? ''
    const netQuantityText = parts[2] ?? ''
    const netUnit = parts[3] ?? ''
    const servingsCountText = parts[4] ?? ''
    const servingLabel = parts[5] ?? ''
    const servingQuantityText = parts[6] ?? ''
    const servingUnit = parts[7] ?? ''
    const netQuantity = Number(netQuantityText.replace(',', '.'))
    const servingsCount = numberOrNull(servingsCountText)
    const servingQuantity = numberOrNull(servingQuantityText)
    if (!label || !isOneOf(packageUnit, packageUnits) || !Number.isFinite(netQuantity) || netQuantity <= 0) return null
    if (!isOneOf(netUnit, netUnits)) return null
    if (servingUnit && !isOneOf(servingUnit, netUnits)) return null
    result.push({
      label,
      package_unit: packageUnit as PackageUnit,
      net_quantity: netQuantity,
      net_unit: netUnit as NetUnit,
      servings_count: servingsCount,
      serving_label: nullable(servingLabel),
      serving_quantity: servingQuantity,
      serving_unit: servingUnit ? servingUnit as NetUnit : null,
      source: 'manual',
      validated: true,
    })
  }
  return result
}

function syncForm(ingredient: Ingredient): void {
  form.mediaImageUri = ingredient.media_profile.main_image_uri ?? ''
  form.mediaImageStatus = ingredient.media_profile.image_status
  form.mediaImagePrompt = ingredient.media_profile.image_prompt ?? ''
  form.mediaSource = ingredient.media_profile.source
  form.mediaValidated = ingredient.media_profile.validated
  form.seasonalityAvailabilityType = ingredient.seasonality_profile.availability_type
  form.seasonalityMonths = formatMonths(ingredient.seasonality_profile.months)
  form.seasonalityGeography = ingredient.seasonality_profile.geography ?? ''
  form.seasonalitySource = ingredient.seasonality_profile.source
  form.seasonalityConfidence = ingredient.seasonality_profile.confidence?.toString() ?? ''
  form.seasonalityValidated = ingredient.seasonality_profile.validated
  form.kcalPer100g = ingredient.nutrition_profile.kcal_per_100g?.toString() ?? ''
  form.kcalPer100ml = ingredient.nutrition_profile.kcal_per_100ml?.toString() ?? ''
  form.nutriScore = ingredient.nutrition_profile.nutri_score
  form.ciqualCode = ingredient.nutrition_profile.ciqual_code ?? ''
  form.nutritionSource = ingredient.nutrition_profile.source
  form.nutritionConfidence = ingredient.nutrition_profile.confidence?.toString() ?? ''
  form.nutritionValidated = ingredient.nutrition_profile.validated
  form.carbonKgCo2ePerKg = ingredient.sustainability_profile.carbon_kg_co2e_per_kg?.toString() ?? ''
  form.agribalyseCode = ingredient.sustainability_profile.agribalyse_code ?? ''
  form.environmentalScore = ingredient.sustainability_profile.environmental_score?.toString() ?? ''
  form.sustainabilitySource = ingredient.sustainability_profile.source
  form.sustainabilityConfidence = ingredient.sustainability_profile.confidence?.toString() ?? ''
  form.sustainabilityValidated = ingredient.sustainability_profile.validated
  form.allergens = formatAllergens(ingredient.allergen_profile.allergens)
  form.allergenSource = ingredient.allergen_profile.source
  form.allergenConfidence = ingredient.allergen_profile.confidence?.toString() ?? ''
  form.allergenValidated = ingredient.allergen_profile.validated
  form.referenceUnit = ingredient.unit_profile.reference_unit
  form.defaultPurchaseUnit = ingredient.unit_profile.default_purchase_unit ?? ''
  form.defaultRecipeUnit = ingredient.unit_profile.default_recipe_unit ?? ''
  form.allowedUnits = ingredient.unit_profile.allowed_units.join(', ')
  form.conversions = formatConversions(ingredient.unit_profile.conversions)
  form.packages = formatPackages(ingredient.package_profiles)
  form.substitutionPolicy = ingredient.substitution_profile.default_policy
  form.substituteIngredientUuids = ingredient.substitution_profile.substitute_ingredient_uuids.join(', ')
  form.substitutionNotes = ingredient.substitution_profile.notes ?? ''
  form.substitutionSource = ingredient.substitution_profile.source
  form.substitutionConfidence = ingredient.substitution_profile.confidence?.toString() ?? ''
  form.substitutionValidated = ingredient.substitution_profile.validated
  form.completenessScore = ingredient.enrichment_profile.completeness_score.toString()
  form.enrichmentStatus = ingredient.enrichment_profile.status
  form.missingFields = ingredient.enrichment_profile.missing_fields.join(', ')
  form.validatedFields = ingredient.enrichment_profile.validated_fields.join(', ')
  form.rejectedFields = ingredient.enrichment_profile.rejected_fields.join(', ')
}

watch(() => props.ingredient, syncForm, { immediate: true })

function buildPayload(): Partial<IngredientPayload> | null {
  formError.value = ''
  const months = parseMonths(form.seasonalityMonths)
  const allergens = parseAllergens(form.allergens)
  const conversions = parseConversions(form.conversions)
  const packages = parsePackages(form.packages)
  if (months === null) {
    formError.value = 'Saisonnalité invalide.'
    return null
  }
  if (allergens === null) {
    formError.value = 'Allergènes invalides.'
    return null
  }
  if (conversions === null) {
    formError.value = 'Conversions invalides.'
    return null
  }
  if (packages === null) {
    formError.value = 'Conditionnements invalides.'
    return null
  }

  const mediaProfile: IngredientMediaProfile = {
    main_image_uri: nullable(form.mediaImageUri),
    image_status: form.mediaImageStatus,
    image_prompt: nullable(form.mediaImagePrompt),
    source: form.mediaSource,
    validated: form.mediaValidated,
  }
  const seasonalityProfile: IngredientSeasonalityProfile = {
    availability_type: form.seasonalityAvailabilityType,
    months,
    geography: nullable(form.seasonalityGeography),
    source: form.seasonalitySource,
    confidence: confidenceOrNull(form.seasonalityConfidence),
    validated: form.seasonalityValidated,
  }
  const nutritionProfile: IngredientNutritionProfile = {
    kcal_per_100g: numberOrNull(form.kcalPer100g),
    kcal_per_100ml: numberOrNull(form.kcalPer100ml),
    nutri_score: form.nutriScore,
    ciqual_code: nullable(form.ciqualCode),
    source: form.nutritionSource,
    confidence: confidenceOrNull(form.nutritionConfidence),
    validated: form.nutritionValidated,
  }
  const sustainabilityProfile: IngredientSustainabilityProfile = {
    carbon_kg_co2e_per_kg: numberOrNull(form.carbonKgCo2ePerKg),
    agribalyse_code: nullable(form.agribalyseCode),
    environmental_score: numberOrNull(form.environmentalScore),
    source: form.sustainabilitySource,
    confidence: confidenceOrNull(form.sustainabilityConfidence),
    validated: form.sustainabilityValidated,
  }
  const allergenProfile: IngredientAllergenProfile = {
    allergens,
    source: form.allergenSource,
    confidence: confidenceOrNull(form.allergenConfidence),
    validated: form.allergenValidated,
  }
  const unitProfile: IngredientUnitProfile = {
    reference_unit: form.referenceUnit,
    default_purchase_unit: nullable(form.defaultPurchaseUnit),
    default_recipe_unit: nullable(form.defaultRecipeUnit),
    allowed_units: splitList(form.allowedUnits),
    conversions,
  }
  const substitutionProfile: IngredientSubstitutionProfile = {
    default_policy: form.substitutionPolicy,
    substitute_ingredient_uuids: splitList(form.substituteIngredientUuids),
    notes: nullable(form.substitutionNotes),
    source: form.substitutionSource,
    confidence: confidenceOrNull(form.substitutionConfidence),
    validated: form.substitutionValidated,
  }
  const enrichmentProfile: IngredientEnrichmentProfile = {
    completeness_score: numberOrNull(form.completenessScore) ?? 0,
    status: form.enrichmentStatus,
    missing_fields: splitList(form.missingFields),
    last_run_uuid: props.ingredient.enrichment_profile.last_run_uuid ?? null,
    last_enriched_at: props.ingredient.enrichment_profile.last_enriched_at ?? null,
    validated_fields: splitList(form.validatedFields),
    rejected_fields: splitList(form.rejectedFields),
  }
  return {
    media_profile: mediaProfile,
    seasonality_profile: seasonalityProfile,
    nutrition_profile: nutritionProfile,
    sustainability_profile: sustainabilityProfile,
    allergen_profile: allergenProfile,
    unit_profile: unitProfile,
    package_profiles: packages,
    substitution_profile: substitutionProfile,
    enrichment_profile: enrichmentProfile,
  }
}

function save(): void {
  const payload = buildPayload()
  if (payload === null) return
  emit('save', payload)
}
</script>

<template>
  <form class="ingredient-profile-editor" @submit.prevent="save">
    <div class="ingredient-profile-editor__grid">
      <fieldset class="ingredient-profile-editor__section">
        <legend>Image</legend>
        <label>
          <span>URI</span>
          <input v-model="form.mediaImageUri" type="text" />
        </label>
        <label>
          <span>Statut</span>
          <select v-model="form.mediaImageStatus">
            <option v-for="status in mediaStatuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
        <label>
          <span>Source</span>
          <select v-model="form.mediaSource">
            <option v-for="source in mediaSources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>
        <label>
          <span>Prompt</span>
          <input v-model="form.mediaImagePrompt" type="text" />
        </label>
        <label class="ingredient-profile-editor__check">
          <input v-model="form.mediaValidated" type="checkbox" />
          <span>Validé</span>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Saisonnalité</legend>
        <label>
          <span>Type</span>
          <select v-model="form.seasonalityAvailabilityType">
            <option v-for="type in availabilityTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>
        <label>
          <span>Mois</span>
          <input v-model="form.seasonalityMonths" type="text" placeholder="6:2, 7:3" />
        </label>
        <label>
          <span>Géographie</span>
          <input v-model="form.seasonalityGeography" type="text" />
        </label>
        <label>
          <span>Source</span>
          <select v-model="form.seasonalitySource">
            <option v-for="source in seasonalitySources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>
        <label>
          <span>Confiance</span>
          <input v-model="form.seasonalityConfidence" type="number" step="0.01" min="0" max="100" />
        </label>
        <label class="ingredient-profile-editor__check">
          <input v-model="form.seasonalityValidated" type="checkbox" />
          <span>Validé</span>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Nutrition</legend>
        <label>
          <span>kcal/100 g</span>
          <input v-model="form.kcalPer100g" type="number" step="0.1" min="0" />
        </label>
        <label>
          <span>kcal/100 ml</span>
          <input v-model="form.kcalPer100ml" type="number" step="0.1" min="0" />
        </label>
        <label>
          <span>Nutri-Score</span>
          <select v-model="form.nutriScore">
            <option v-for="score in nutriScores" :key="score" :value="score">{{ score }}</option>
          </select>
        </label>
        <label>
          <span>CIQUAL</span>
          <input v-model="form.ciqualCode" type="text" />
        </label>
        <label>
          <span>Source</span>
          <select v-model="form.nutritionSource">
            <option v-for="source in nutritionSources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>
        <label class="ingredient-profile-editor__check">
          <input v-model="form.nutritionValidated" type="checkbox" />
          <span>Validé</span>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Environnement</legend>
        <label>
          <span>CO2e/kg</span>
          <input v-model="form.carbonKgCo2ePerKg" type="number" step="0.001" min="0" />
        </label>
        <label>
          <span>Agribalyse</span>
          <input v-model="form.agribalyseCode" type="text" />
        </label>
        <label>
          <span>Score</span>
          <input v-model="form.environmentalScore" type="number" step="0.1" min="0" />
        </label>
        <label>
          <span>Source</span>
          <select v-model="form.sustainabilitySource">
            <option v-for="source in sustainabilitySources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>
        <label class="ingredient-profile-editor__check">
          <input v-model="form.sustainabilityValidated" type="checkbox" />
          <span>Validé</span>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Allergènes</legend>
        <label class="ingredient-profile-editor__wide">
          <span>Allergènes</span>
          <textarea v-model="form.allergens" rows="3" placeholder="gluten:contains"></textarea>
        </label>
        <label>
          <span>Source</span>
          <select v-model="form.allergenSource">
            <option v-for="source in allergenSources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>
        <label>
          <span>Confiance</span>
          <input v-model="form.allergenConfidence" type="number" step="0.01" min="0" max="100" />
        </label>
        <label class="ingredient-profile-editor__check">
          <input v-model="form.allergenValidated" type="checkbox" />
          <span>Validé</span>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Unités</legend>
        <label>
          <span>Référence</span>
          <select v-model="form.referenceUnit">
            <option v-for="unit in referenceUnits" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </label>
        <label>
          <span>Achat</span>
          <input v-model="form.defaultPurchaseUnit" type="text" />
        </label>
        <label>
          <span>Recette</span>
          <input v-model="form.defaultRecipeUnit" type="text" />
        </label>
        <label>
          <span>Autorisées</span>
          <input v-model="form.allowedUnits" type="text" />
        </label>
        <label class="ingredient-profile-editor__wide">
          <span>Conversions</span>
          <textarea v-model="form.conversions" rows="3" placeholder="piece>g=55"></textarea>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Conditionnements</legend>
        <label class="ingredient-profile-editor__wide">
          <span>Lots</span>
          <textarea v-model="form.packages" rows="4" placeholder="barquette|barquette|250|g|2"></textarea>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Substitutions</legend>
        <label>
          <span>Politique</span>
          <select v-model="form.substitutionPolicy">
            <option v-for="policy in substitutionPolicies" :key="policy" :value="policy">{{ policy }}</option>
          </select>
        </label>
        <label>
          <span>Ingrédients</span>
          <input v-model="form.substituteIngredientUuids" type="text" />
        </label>
        <label>
          <span>Source</span>
          <select v-model="form.substitutionSource">
            <option v-for="source in mediaSources" :key="source" :value="source">{{ source }}</option>
          </select>
        </label>
        <label class="ingredient-profile-editor__wide">
          <span>Notes</span>
          <textarea v-model="form.substitutionNotes" rows="3"></textarea>
        </label>
        <label class="ingredient-profile-editor__check">
          <input v-model="form.substitutionValidated" type="checkbox" />
          <span>Validé</span>
        </label>
      </fieldset>

      <fieldset class="ingredient-profile-editor__section">
        <legend>Complétude</legend>
        <label>
          <span>Score</span>
          <input v-model="form.completenessScore" type="number" step="1" min="0" max="100" />
        </label>
        <label>
          <span>Statut</span>
          <select v-model="form.enrichmentStatus">
            <option v-for="status in enrichmentStatuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
        <label>
          <span>Manquants</span>
          <input v-model="form.missingFields" type="text" />
        </label>
        <label>
          <span>Validés</span>
          <input v-model="form.validatedFields" type="text" />
        </label>
        <label>
          <span>Rejetés</span>
          <input v-model="form.rejectedFields" type="text" />
        </label>
      </fieldset>
    </div>

    <p v-if="formError || error" class="ingredient-profile-editor__error">{{ formError || error }}</p>
    <div class="ingredient-profile-editor__actions">
      <AppButton type="submit" :disabled="isSaving">
        {{ isSaving ? 'Enregistrement…' : 'Enregistrer les profils' }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped>
.ingredient-profile-editor {
  display: grid;
  gap: 14px;
}

.ingredient-profile-editor__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.ingredient-profile-editor__section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.ingredient-profile-editor__section legend {
  padding: 0 6px;
  color: var(--color-text-primary);
  font-weight: 700;
}

.ingredient-profile-editor label {
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
}

.ingredient-profile-editor input,
.ingredient-profile-editor select,
.ingredient-profile-editor textarea {
  min-width: 0;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.ingredient-profile-editor textarea {
  resize: vertical;
}

.ingredient-profile-editor__wide {
  grid-column: 1 / -1;
}

.ingredient-profile-editor__check {
  display: flex !important;
  flex-direction: row;
  align-items: center;
}

.ingredient-profile-editor__check input {
  width: 18px;
  min-height: 18px;
}

.ingredient-profile-editor__actions {
  display: flex;
  justify-content: flex-end;
}

.ingredient-profile-editor__error {
  margin: 0;
  color: var(--color-danger);
  font-weight: 650;
}

@media (max-width: 720px) {
  .ingredient-profile-editor__section {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
