<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import type {
  Ingredient,
  IngredientAllergen,
  IngredientAllergenProfile,
  IngredientGroup,
  IngredientNutritionProfile,
  IngredientPackageProfile,
  IngredientPayload,
  IngredientRayon,
  IngredientSeasonalityProfile,
  IngredientSubstitutionProfile,
  IngredientSustainabilityProfile,
  IngredientUnitConversion,
  IngredientUnitProfile,
} from '@/types/recipe'

const props = defineProps<{
  ingredient: Ingredient
  groups?: IngredientGroup[]
  rayons?: IngredientRayon[]
  ingredientOptions?: Ingredient[]
  isSaving?: boolean
  isDeleting?: boolean
  error?: string
}>()

const emit = defineEmits<{
  cancel: []
  save: [payload: Partial<IngredientPayload>]
  delete: []
}>()

const monthOptions = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const availabilityOptions = [
  { value: 'unknown', label: 'À définir' },
  { value: 'year_round', label: 'Toute l’année' },
  { value: 'seasonal', label: 'Saisonnier' },
  { value: 'not_applicable', label: 'Non applicable' },
] as const
const referenceUnits = ['g', 'kg', 'ml', 'cl', 'l', 'piece', 'serving', 'unknown'] as const
const nutriScores = ['A', 'B', 'C', 'D', 'E', 'not_applicable', 'unknown'] as const
const allergenDefinitions = [
  ['gluten', 'Gluten'], ['crustaceans', 'Crustacés'], ['eggs', 'Œufs'], ['fish', 'Poisson'],
  ['peanuts', 'Arachides'], ['soy', 'Soja'], ['milk', 'Lait'], ['nuts', 'Fruits à coque'],
  ['celery', 'Céleri'], ['mustard', 'Moutarde'], ['sesame', 'Sésame'], ['sulphites', 'Sulfites'],
  ['lupin', 'Lupin'], ['molluscs', 'Mollusques'],
] as const
const presenceOptions = [
  { value: 'contains', label: 'Contient' },
  { value: 'may_contain', label: 'Peut contenir' },
  { value: 'absent', label: 'Absent' },
  { value: 'unknown', label: 'À confirmer' },
] as const
const packageUnits = ['paquet', 'bouteille', 'boite', 'barquette', 'piece', 'custom'] as const
const netUnits = ['g', 'ml', 'piece'] as const
const substitutionPolicies = [
  { value: 'unknown', label: 'À définir' },
  { value: 'substitutable', label: 'Substituable' },
  { value: 'essential_by_default', label: 'Essentiel par défaut' },
] as const

type AvailabilityType = IngredientSeasonalityProfile['availability_type']
type ReferenceUnit = IngredientUnitProfile['reference_unit']
type NutriScore = IngredientNutritionProfile['nutri_score']
type AllergenCode = IngredientAllergen['code']
type AllergenPresence = IngredientAllergen['presence']
type PackageUnit = IngredientPackageProfile['package_unit']
type NetUnit = IngredientPackageProfile['net_unit']
type SubstitutionPolicy = IngredientSubstitutionProfile['default_policy']

interface ConversionRow { from: string; to: string; factor: string }
interface PackageRow { label: string; packageUnit: PackageUnit; quantity: string; netUnit: NetUnit }

const form = reactive({
  name: '', groupUuid: '', rayonUuid: '',
  availabilityType: 'unknown' as AvailabilityType,
  selectedMonths: [] as number[], peakMonths: [] as number[], geography: '', seasonalityValidated: false,
  kcalPer100g: '', kcalPer100ml: '', nutriScore: 'unknown' as NutriScore, ciqualCode: '', nutritionValidated: false,
  carbon: '', agribalyseCode: '', environmentalScore: '', sustainabilityValidated: false,
  allergenValidated: false,
  referenceUnit: 'unknown' as ReferenceUnit, purchaseUnit: '', recipeUnit: '', allowedUnits: '',
  conversions: [] as ConversionRow[], packages: [] as PackageRow[],
  substitutionPolicy: 'unknown' as SubstitutionPolicy,
  substituteUuids: [] as string[], substitutionNotes: '', substitutionValidated: false,
})
const allergenPresence = reactive<Record<AllergenCode, AllergenPresence | ''>>(
  Object.fromEntries(allergenDefinitions.map(([code]) => [code, ''])) as Record<AllergenCode, ''>,
)
const formError = ref('')
const substitutionSearch = ref('')

const ingredientChoices = computed(() =>
  (props.ingredientOptions ?? [])
    .filter((item) => item.uuid !== props.ingredient.uuid)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, 'fr')),
)
const visibleIngredientChoices = computed(() => {
  const query = substitutionSearch.value.trim().toLocaleLowerCase('fr-FR')
  return ingredientChoices.value
    .filter((item) => form.substituteUuids.includes(item.uuid) || !query || item.name.toLocaleLowerCase('fr-FR').includes(query))
    .slice(0, 24)
})
const selectedSubstitutions = computed(() =>
  form.substituteUuids
    .map((uuid) => ingredientChoices.value.find((item) => item.uuid === uuid))
    .filter((item): item is Ingredient => Boolean(item)),
)

const numberOrNull = (value: string): number | null => {
  const parsed = Number(value.trim().replace(',', '.'))
  return value.trim() && Number.isFinite(parsed) ? parsed : null
}

const syncForm = (ingredient: Ingredient): void => {
  form.name = ingredient.name
  form.groupUuid = ingredient.group_uuid ?? ''
  form.rayonUuid = ingredient.rayon_uuid ?? ''
  form.availabilityType = ingredient.seasonality_profile.availability_type
  form.selectedMonths = Object.entries(ingredient.seasonality_profile.months).filter(([, score]) => Number(score) > 0).map(([month]) => Number(month))
  form.peakMonths = Object.entries(ingredient.seasonality_profile.months).filter(([, score]) => Number(score) >= 3).map(([month]) => Number(month))
  form.geography = ingredient.seasonality_profile.geography ?? ''
  form.seasonalityValidated = ingredient.seasonality_profile.validated
  form.kcalPer100g = ingredient.nutrition_profile.kcal_per_100g?.toString() ?? ''
  form.kcalPer100ml = ingredient.nutrition_profile.kcal_per_100ml?.toString() ?? ''
  form.nutriScore = ingredient.nutrition_profile.nutri_score
  form.ciqualCode = ingredient.nutrition_profile.ciqual_code ?? ''
  form.nutritionValidated = ingredient.nutrition_profile.validated
  form.carbon = ingredient.sustainability_profile.carbon_kg_co2e_per_kg?.toString() ?? ''
  form.agribalyseCode = ingredient.sustainability_profile.agribalyse_code ?? ''
  form.environmentalScore = ingredient.sustainability_profile.environmental_score?.toString() ?? ''
  form.sustainabilityValidated = ingredient.sustainability_profile.validated
  Object.keys(allergenPresence).forEach((code) => { allergenPresence[code as AllergenCode] = '' })
  ingredient.allergen_profile.allergens.forEach((allergen) => { allergenPresence[allergen.code] = allergen.presence })
  form.allergenValidated = ingredient.allergen_profile.validated
  form.referenceUnit = ingredient.unit_profile.reference_unit
  form.purchaseUnit = ingredient.unit_profile.default_purchase_unit ?? ''
  form.recipeUnit = ingredient.unit_profile.default_recipe_unit ?? ''
  form.allowedUnits = ingredient.unit_profile.allowed_units.join(', ')
  form.conversions = ingredient.unit_profile.conversions.map((item) => ({ from: item.from_unit, to: item.to_unit, factor: String(item.factor) }))
  form.packages = ingredient.package_profiles.map((item) => ({ label: item.label, packageUnit: item.package_unit, quantity: String(item.net_quantity), netUnit: item.net_unit }))
  form.substitutionPolicy = ingredient.substitution_profile.default_policy
  form.substituteUuids = [...ingredient.substitution_profile.substitute_ingredient_uuids]
  form.substitutionNotes = ingredient.substitution_profile.notes ?? ''
  form.substitutionValidated = ingredient.substitution_profile.validated
  formError.value = ''
}

watch(() => props.ingredient, syncForm, { immediate: true })

const toggleMonth = (month: number): void => {
  if (!form.selectedMonths.includes(month)) {
    form.selectedMonths = [...form.selectedMonths, month].sort((a, b) => a - b)
    return
  }
  if (!form.peakMonths.includes(month)) {
    form.peakMonths = [...form.peakMonths, month].sort((a, b) => a - b)
    return
  }
  form.selectedMonths = form.selectedMonths.filter((item) => item !== month)
  form.peakMonths = form.peakMonths.filter((item) => item !== month)
}

const toggleSubstitution = (uuid: string): void => {
  form.substituteUuids = form.substituteUuids.includes(uuid)
    ? form.substituteUuids.filter((item) => item !== uuid)
    : [...form.substituteUuids, uuid]
}

const addConversion = (): void => { form.conversions.push({ from: '', to: '', factor: '' }) }
const addPackage = (): void => { form.packages.push({ label: '', packageUnit: 'paquet', quantity: '', netUnit: 'g' }) }

const save = (): void => {
  formError.value = ''
  const name = form.name.trim()
  if (!name) { formError.value = 'Le nom de l’ingrédient est obligatoire.'; return }
  if (form.conversions.some((row) => !row.from.trim() || !row.to.trim() || (numberOrNull(row.factor) ?? 0) <= 0)) {
    formError.value = 'Chaque conversion doit préciser deux unités et un facteur positif.'
    return
  }
  if (form.packages.some((row) => !row.label.trim() || (numberOrNull(row.quantity) ?? 0) <= 0)) {
    formError.value = 'Chaque conditionnement doit avoir un libellé et une quantité positive.'
    return
  }

  const months = Object.fromEntries(form.selectedMonths.map((month) => [month, form.peakMonths.includes(month) ? 3 : 2])) as Record<number, number>
  const allergens = allergenDefinitions.flatMap(([code]) => {
    const presence = allergenPresence[code]
    return presence ? [{ code, presence, note: null }] : []
  }) as IngredientAllergen[]
  const conversions: IngredientUnitConversion[] = form.conversions.map((row) => ({
    from_unit: row.from.trim(), to_unit: row.to.trim(), factor: numberOrNull(row.factor) ?? 1,
    source: 'ingredient_specific', confidence: null,
  }))
  const packages: IngredientPackageProfile[] = form.packages.map((row) => ({
    label: row.label.trim(), package_unit: row.packageUnit, net_quantity: numberOrNull(row.quantity) ?? 1, net_unit: row.netUnit,
    servings_count: null, serving_label: null, serving_quantity: null, serving_unit: null, source: 'manual', validated: true,
  }))
  const seasonalityProfile: IngredientSeasonalityProfile = {
    ...props.ingredient.seasonality_profile, availability_type: form.availabilityType, months,
    geography: form.geography.trim() || null, source: 'manual',
    confidence: form.seasonalityValidated ? 1 : props.ingredient.seasonality_profile.confidence,
    validated: form.seasonalityValidated,
  }
  const nutritionProfile: IngredientNutritionProfile = {
    ...props.ingredient.nutrition_profile,
    kcal_per_100g: numberOrNull(form.kcalPer100g), kcal_per_100ml: numberOrNull(form.kcalPer100ml),
    nutri_score: form.nutriScore, ciqual_code: form.ciqualCode.trim() || null, source: 'manual',
    confidence: form.nutritionValidated ? 1 : props.ingredient.nutrition_profile.confidence,
    validated: form.nutritionValidated,
  }
  const sustainabilityProfile: IngredientSustainabilityProfile = {
    ...props.ingredient.sustainability_profile,
    carbon_kg_co2e_per_kg: numberOrNull(form.carbon), agribalyse_code: form.agribalyseCode.trim() || null,
    environmental_score: numberOrNull(form.environmentalScore), source: 'manual',
    confidence: form.sustainabilityValidated ? 1 : props.ingredient.sustainability_profile.confidence,
    validated: form.sustainabilityValidated,
  }
  const allergenProfile: IngredientAllergenProfile = {
    allergens, source: 'manual',
    confidence: form.allergenValidated ? 1 : props.ingredient.allergen_profile.confidence,
    validated: form.allergenValidated,
  }
  const unitProfile: IngredientUnitProfile = {
    reference_unit: form.referenceUnit, default_purchase_unit: form.purchaseUnit.trim() || null,
    default_recipe_unit: form.recipeUnit.trim() || null,
    allowed_units: form.allowedUnits.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean), conversions,
  }
  const substitutionProfile: IngredientSubstitutionProfile = {
    ...props.ingredient.substitution_profile, default_policy: form.substitutionPolicy,
    substitute_ingredient_uuids: [...form.substituteUuids], notes: form.substitutionNotes.trim() || null,
    source: 'manual', confidence: form.substitutionValidated ? 1 : props.ingredient.substitution_profile.confidence,
    validated: form.substitutionValidated,
  }

  emit('save', {
    name, group_uuid: form.groupUuid || null, rayon_uuid: form.rayonUuid || null,
    unit: form.recipeUnit.trim() || (form.referenceUnit !== 'unknown' ? form.referenceUnit : null),
    season_months: months, seasonality_profile: seasonalityProfile, nutrition_profile: nutritionProfile,
    sustainability_profile: sustainabilityProfile, allergen_profile: allergenProfile, unit_profile: unitProfile,
    package_profiles: packages, substitution_profile: substitutionProfile,
  })
}
</script>

<template>
  <form class="ingredient-editor" @submit.prevent="save">
    <header class="ingredient-editor__header">
      <div><h2>Modifier {{ ingredient.name }}</h2><p>Renseignez uniquement les informations fiables. Les champs vides pourront être complétés par l’agent.</p></div>
    </header>

    <div class="ingredient-editor__layout">
      <nav class="ingredient-editor__nav" aria-label="Sections de la fiche">
        <a href="#ingredient-identity">Identité</a>
        <a href="#ingredient-seasonality">Saisonnalité</a>
        <a href="#ingredient-nutrition">Nutrition</a>
        <a href="#ingredient-environment">Environnement</a>
        <a href="#ingredient-allergens">Allergènes</a>
        <a href="#ingredient-units">Unités</a>
        <a href="#ingredient-packages">Conditionnements</a>
        <a href="#ingredient-substitutions">Substitutions</a>
        <span>Fournisseurs · à venir</span>
      </nav>

      <div class="ingredient-editor__content">
    <section id="ingredient-identity" class="ingredient-editor__section">
      <div class="ingredient-editor__section-title"><div><h3>Identité</h3><p>Nom et classement dans le catalogue.</p></div></div>
      <div class="ingredient-editor__fields ingredient-editor__fields--three">
        <label><span>Nom</span><input v-model="form.name" type="text" required /></label>
        <label><span>Groupe</span><select v-model="form.groupUuid"><option value="">Aucun groupe</option><option v-for="group in groups ?? []" :key="group.uuid" :value="group.uuid">{{ group.name }}</option></select></label>
        <label><span>Rayon</span><select v-model="form.rayonUuid"><option value="">Aucun rayon</option><option v-for="rayon in rayons ?? []" :key="rayon.uuid" :value="rayon.uuid">{{ rayon.name }}</option></select></label>
      </div>
    </section>

    <section id="ingredient-seasonality" class="ingredient-editor__section">
      <div class="ingredient-editor__section-title"><div><h3>Saisonnalité</h3><p>Cliquez une fois pour « disponible », deux fois pour « pleine saison », puis une troisième fois pour retirer le mois.</p></div></div>
      <div class="ingredient-editor__fields ingredient-editor__fields--three">
        <label><span>Disponibilité</span><select v-model="form.availabilityType"><option v-for="option in availabilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        <label class="ingredient-editor__span-two"><span>Zone géographique</span><input v-model="form.geography" type="text" placeholder="France métropolitaine" /></label>
      </div>
      <div v-if="form.availabilityType === 'seasonal'" class="ingredient-editor__months">
        <button v-for="(month, index) in monthOptions" :key="month" type="button" :class="{ 'is-selected': form.selectedMonths.includes(index + 1), 'is-peak': form.peakMonths.includes(index + 1) }" @click="toggleMonth(index + 1)">
          <span>{{ month.slice(0, 3) }}</span><small>{{ form.peakMonths.includes(index + 1) ? 'Pleine saison' : form.selectedMonths.includes(index + 1) ? 'Disponible' : '—' }}</small>
        </button>
      </div>
      <label class="ingredient-editor__validation"><input v-model="form.seasonalityValidated" type="checkbox" /><span>Informations vérifiées</span></label>
    </section>

    <div class="ingredient-editor__columns">
      <section id="ingredient-nutrition" class="ingredient-editor__section">
        <div class="ingredient-editor__section-title"><div><h3>Nutrition</h3><p>Valeurs de référence pour 100 g ou 100 ml.</p></div></div>
        <div class="ingredient-editor__fields ingredient-editor__fields--two">
          <label><span>kcal / 100 g</span><input v-model="form.kcalPer100g" type="number" min="0" step="0.1" /></label>
          <label><span>kcal / 100 ml</span><input v-model="form.kcalPer100ml" type="number" min="0" step="0.1" /></label>
          <label><span>Nutri-Score</span><select v-model="form.nutriScore"><option v-for="score in nutriScores" :key="score" :value="score">{{ score }}</option></select></label>
          <label><span>Code CIQUAL</span><input v-model="form.ciqualCode" type="text" /></label>
        </div>
        <label class="ingredient-editor__validation"><input v-model="form.nutritionValidated" type="checkbox" /><span>Informations vérifiées</span></label>
      </section>
      <section id="ingredient-environment" class="ingredient-editor__section">
        <div class="ingredient-editor__section-title"><div><h3>Environnement</h3><p>Impact carbone et référentiel Agribalyse.</p></div></div>
        <div class="ingredient-editor__fields ingredient-editor__fields--two">
          <label><span>kg CO2e / kg</span><input v-model="form.carbon" type="number" min="0" step="0.001" /></label>
          <label><span>Score environnemental</span><input v-model="form.environmentalScore" type="number" min="0" step="0.1" /></label>
          <label class="ingredient-editor__span-two"><span>Code Agribalyse</span><input v-model="form.agribalyseCode" type="text" /></label>
        </div>
        <label class="ingredient-editor__validation"><input v-model="form.sustainabilityValidated" type="checkbox" /><span>Informations vérifiées</span></label>
      </section>
    </div>

    <section id="ingredient-allergens" class="ingredient-editor__section">
      <div class="ingredient-editor__section-title"><div><h3>Allergènes</h3><p>Ne renseignez que les allergènes dont le statut est connu.</p></div></div>
      <div class="ingredient-editor__allergens">
        <label v-for="([code, label]) in allergenDefinitions" :key="code"><span>{{ label }}</span><select v-model="allergenPresence[code]"><option value="">Non renseigné</option><option v-for="option in presenceOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>
      <label class="ingredient-editor__validation"><input v-model="form.allergenValidated" type="checkbox" /><span>Informations vérifiées</span></label>
    </section>

    <section id="ingredient-units" class="ingredient-editor__section">
      <div class="ingredient-editor__section-title"><div><h3>Unités et conversions</h3><p>Unités utilisées dans les recettes et lors de l’achat.</p></div></div>
      <div class="ingredient-editor__fields ingredient-editor__fields--three">
        <label><span>Unité de référence</span><select v-model="form.referenceUnit"><option v-for="unit in referenceUnits" :key="unit" :value="unit">{{ unit }}</option></select></label>
        <label><span>Unité d’achat</span><input v-model="form.purchaseUnit" type="text" placeholder="barquette" /></label>
        <label><span>Unité en recette</span><input v-model="form.recipeUnit" type="text" placeholder="g" /></label>
        <label class="ingredient-editor__span-three"><span>Unités autorisées</span><input v-model="form.allowedUnits" type="text" placeholder="g, kg, pièce" /><small>Séparez les unités par une virgule.</small></label>
      </div>
      <div class="ingredient-editor__rows">
        <div v-for="(row, index) in form.conversions" :key="index" class="ingredient-editor__row ingredient-editor__row--conversion">
          <input v-model="row.from" type="text" aria-label="Unité de départ" placeholder="pièce" /><span>→</span><input v-model="row.to" type="text" aria-label="Unité d’arrivée" placeholder="g" /><input v-model="row.factor" type="number" min="0.0001" step="0.0001" aria-label="Facteur" placeholder="55" /><button type="button" aria-label="Supprimer la conversion" @click="form.conversions.splice(index, 1)">×</button>
        </div>
        <button type="button" class="ingredient-editor__add" @click="addConversion">＋ Ajouter une conversion</button>
      </div>
    </section>

    <section id="ingredient-packages" class="ingredient-editor__section">
      <div class="ingredient-editor__section-title"><div><h3>Conditionnements</h3><p>Formats courants proposés à l’achat.</p></div></div>
      <div class="ingredient-editor__rows">
        <div v-for="(row, index) in form.packages" :key="index" class="ingredient-editor__row ingredient-editor__row--package">
          <input v-model="row.label" type="text" aria-label="Libellé" placeholder="Barquette 250 g" /><select v-model="row.packageUnit" aria-label="Type"><option v-for="unit in packageUnits" :key="unit" :value="unit">{{ unit }}</option></select><input v-model="row.quantity" type="number" min="0.01" step="0.01" aria-label="Quantité" placeholder="250" /><select v-model="row.netUnit" aria-label="Unité"><option v-for="unit in netUnits" :key="unit" :value="unit">{{ unit }}</option></select><button type="button" aria-label="Supprimer" @click="form.packages.splice(index, 1)">×</button>
        </div>
        <button type="button" class="ingredient-editor__add" @click="addPackage">＋ Ajouter un conditionnement</button>
      </div>
    </section>

    <section id="ingredient-substitutions" class="ingredient-editor__section">
      <div class="ingredient-editor__section-title"><div><h3>Substitutions</h3><p>Alternatives possibles lorsque l’ingrédient manque.</p></div></div>
      <div class="ingredient-editor__fields ingredient-editor__fields--two">
        <label><span>Politique</span><select v-model="form.substitutionPolicy"><option v-for="option in substitutionPolicies" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        <label><span>Rechercher une alternative</span><input v-model="substitutionSearch" type="search" placeholder="Nom de l’ingrédient" /></label>
        <div class="ingredient-editor__substitutions ingredient-editor__span-two">
          <button
            v-for="option in visibleIngredientChoices"
            :key="option.uuid"
            type="button"
            :class="{ 'is-selected': form.substituteUuids.includes(option.uuid) }"
            :aria-pressed="form.substituteUuids.includes(option.uuid)"
            @click="toggleSubstitution(option.uuid)"
          >{{ option.name }}</button>
          <p v-if="!visibleIngredientChoices.length">Aucun ingrédient correspondant.</p>
        </div>
        <div v-if="selectedSubstitutions.length" class="ingredient-editor__selection ingredient-editor__span-two">
          <strong>Alternatives retenues</strong>
          <span v-for="option in selectedSubstitutions" :key="option.uuid">{{ option.name }}<button type="button" :aria-label="`Retirer ${option.name}`" @click="toggleSubstitution(option.uuid)">×</button></span>
        </div>
        <label class="ingredient-editor__span-two"><span>Conseils de substitution</span><textarea v-model="form.substitutionNotes" rows="3" placeholder="Préciser les proportions ou les limites…"></textarea></label>
      </div>
      <label class="ingredient-editor__validation"><input v-model="form.substitutionValidated" type="checkbox" /><span>Informations vérifiées</span></label>
    </section>

    <section class="ingredient-editor__section ingredient-editor__section--deferred">
      <div class="ingredient-editor__section-title"><div><h3>Fournisseurs</h3><p>Cette section sera reliée au catalogue fournisseurs lors de la prochaine itération.</p></div></div>
      <span class="ingredient-editor__coming-soon">Section réservée</span>
    </section>

    <p v-if="formError || error" class="ingredient-editor__error">{{ formError || error }}</p>
      </div>
    </div>
    <footer class="ingredient-editor__actions">
      <AppButton class="ingredient-editor__delete" type="button" variant="danger" :disabled="isSaving || isDeleting" @click="$emit('delete')">
        {{ isDeleting ? 'Suppression…' : 'Supprimer l’ingrédient' }}
      </AppButton>
      <div>
        <AppButton type="button" variant="secondary" :disabled="isDeleting" @click="$emit('cancel')">Annuler</AppButton>
        <AppButton type="submit" :disabled="isSaving || isDeleting">{{ isSaving ? 'Enregistrement…' : 'Enregistrer' }}</AppButton>
      </div>
    </footer>
  </form>
</template>

<style scoped>
.ingredient-editor { width: min(1180px, 100%); margin: 0 auto; display: grid; gap: 16px; }
.ingredient-editor__header { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 0.8fr); align-items: end; gap: 28px; margin-bottom: 4px; }
.ingredient-editor__header p, .ingredient-editor__header h2 { margin: 0; }
.ingredient-editor__header > div > p { margin-bottom: 5px; color: var(--color-text-tertiary); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.ingredient-editor__header h2 { font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -0.03em; }
.ingredient-editor__header > p { color: var(--color-text-secondary); line-height: 1.55; }
.ingredient-editor__section { display: grid; gap: 18px; padding: clamp(18px, 2.8vw, 28px); border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-surface); box-shadow: var(--shadow-sm); }
.ingredient-editor__section--deferred { grid-template-columns: minmax(0, 1fr) auto; align-items: center; border-style: dashed; background: color-mix(in srgb, var(--color-secondary) 32%, var(--color-surface)); }
.ingredient-editor__section-title { display: flex; align-items: flex-start; gap: 13px; }
.ingredient-editor__section-title > span { min-width: 34px; height: 28px; display: grid; place-items: center; padding-inline: 5px; border-radius: 9px; background: var(--color-secondary); color: var(--color-text-secondary); font-size: 0.68rem; font-weight: 850; text-transform: uppercase; }
.ingredient-editor__section-title h3, .ingredient-editor__section-title p { margin: 0; }
.ingredient-editor__section-title h3 { font-size: 1.08rem; }
.ingredient-editor__section-title p { margin-top: 3px; color: var(--color-text-tertiary); font-size: 0.86rem; line-height: 1.45; }
.ingredient-editor__columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.ingredient-editor__fields { display: grid; gap: 14px; }
.ingredient-editor__fields--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.ingredient-editor__fields--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ingredient-editor__span-two { grid-column: span 2; }
.ingredient-editor__span-three { grid-column: span 3; }
.ingredient-editor label { display: grid; gap: 6px; color: var(--color-text-secondary); font-size: 0.84rem; font-weight: 700; }
.ingredient-editor label small { color: var(--color-text-tertiary); font-weight: 500; }
.ingredient-editor input, .ingredient-editor select, .ingredient-editor textarea { min-width: 0; box-sizing: border-box; min-height: 44px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 11px; background: var(--color-background); color: var(--color-text-primary); font: inherit; }
.ingredient-editor textarea { resize: vertical; line-height: 1.5; }
.ingredient-editor select[multiple] { min-height: 126px; }
.ingredient-editor input:focus, .ingredient-editor select:focus, .ingredient-editor textarea:focus { border-color: var(--color-focus); outline: 3px solid color-mix(in srgb, var(--color-focus) 18%, transparent); }
.ingredient-editor__months { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px; }
.ingredient-editor__months button { min-height: 58px; display: grid; gap: 2px; padding: 8px 4px; border: 1px solid var(--color-border); border-radius: 11px; background: var(--color-background); color: var(--color-text-secondary); cursor: pointer; font: inherit; }
.ingredient-editor__months button span { font-weight: 800; }
.ingredient-editor__months button small { overflow: hidden; font-size: 0.62rem; text-overflow: ellipsis; white-space: nowrap; }
.ingredient-editor__months button.is-selected { border-color: color-mix(in srgb, var(--color-primary) 42%, var(--color-border)); background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)); color: var(--color-text-primary); }
.ingredient-editor__months button.is-peak { background: color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)); }
.ingredient-editor__helper { margin: -8px 0 0; color: var(--color-text-tertiary); font-size: 0.76rem; }
.ingredient-editor__allergens { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 9px; }
.ingredient-editor__allergens label { gap: 4px; padding: 9px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-background); }
.ingredient-editor__allergens select { min-height: 38px; padding-block: 7px; }
.ingredient-editor__validation { display: flex !important; grid-template-columns: auto 1fr; align-items: center; justify-self: start; }
.ingredient-editor__validation input { width: 18px; min-height: 18px; }
.ingredient-editor__rows { display: grid; gap: 9px; }
.ingredient-editor__row { display: grid; align-items: center; gap: 8px; }
.ingredient-editor__row--conversion { grid-template-columns: minmax(100px, 1fr) auto minmax(100px, 1fr) minmax(100px, 0.7fr) 38px; }
.ingredient-editor__row--package { grid-template-columns: minmax(170px, 1.4fr) minmax(120px, 1fr) minmax(100px, 0.7fr) minmax(90px, 0.6fr) 38px; }
.ingredient-editor__row > button { width: 38px; height: 38px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface); color: var(--color-danger); cursor: pointer; font: inherit; font-weight: 850; }
.ingredient-editor__add { justify-self: start; min-height: 40px; padding: 8px 12px; border: 1px dashed var(--color-border-hover); border-radius: 11px; background: transparent; color: var(--color-text-secondary); cursor: pointer; font: inherit; font-weight: 700; }
.ingredient-editor__add:hover { background: var(--color-secondary); color: var(--color-text-primary); }
.ingredient-editor__coming-soon { padding: 8px 11px; border-radius: 999px; background: var(--color-surface); color: var(--color-text-tertiary); font-size: 0.76rem; font-weight: 800; }
.ingredient-editor__actions { position: sticky; bottom: 8px; z-index: 3; display: flex; justify-content: flex-end; gap: 9px; padding: 10px; border: 1px solid rgba(255,255,255,.7); border-radius: 16px; background: rgba(249,249,250,.9); box-shadow: 0 14px 40px rgba(15,23,42,.14); backdrop-filter: blur(16px); }
.ingredient-editor__error { margin: 0; padding: 12px 14px; border-radius: 11px; background: color-mix(in srgb, var(--color-danger) 9%, var(--color-surface)); color: var(--color-danger); font-weight: 700; }
@media (max-width: 820px) { .ingredient-editor__header, .ingredient-editor__columns { grid-template-columns: 1fr; } .ingredient-editor__fields--three { grid-template-columns: repeat(2,minmax(0,1fr)); } .ingredient-editor__span-three { grid-column: span 2; } .ingredient-editor__months { grid-template-columns: repeat(4,minmax(0,1fr)); } }
@media (max-width: 560px) { .ingredient-editor__fields--two, .ingredient-editor__fields--three { grid-template-columns: 1fr; } .ingredient-editor__span-two, .ingredient-editor__span-three { grid-column: auto; } .ingredient-editor__months { grid-template-columns: repeat(3,minmax(0,1fr)); } .ingredient-editor__row--conversion, .ingredient-editor__row--package { grid-template-columns: 1fr 1fr; } .ingredient-editor__row > button { grid-column: 2; justify-self: end; } .ingredient-editor__section--deferred { grid-template-columns: 1fr; } }

/* Editing workspace */
.ingredient-editor { width: min(1320px, 100%); gap: 20px; }
.ingredient-editor__header { display: block; margin: 0; padding: 4px 2px; }
.ingredient-editor__header h2 { margin: 0; font-size: clamp(1.9rem, 4vw, 3rem); line-height: 1; letter-spacing: -0.04em; }
.ingredient-editor__header > div > p {
  max-width: 720px;
  margin: 10px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.94rem;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.5;
  text-transform: none;
}

.ingredient-editor__layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}

.ingredient-editor__nav {
  position: sticky;
  top: 0;
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.ingredient-editor__nav a,
.ingredient-editor__nav > span {
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}
.ingredient-editor__nav a:hover { background: var(--color-secondary); color: var(--color-text-primary); text-decoration: none; }
.ingredient-editor__nav > span { border-top: 1px solid var(--color-border); border-radius: 0; color: var(--color-text-tertiary); font-size: 0.74rem; }

.ingredient-editor__content { min-width: 0; display: grid; gap: 16px; }
.ingredient-editor__section { scroll-margin-top: 16px; padding: clamp(20px, 3vw, 30px); }
.ingredient-editor__section-title { display: block; }
.ingredient-editor__section-title h3 { font-size: 1.2rem; }
.ingredient-editor__section-title p { max-width: 760px; }

.ingredient-editor__substitutions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  max-height: 176px;
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 13px;
  background: var(--color-background);
}
.ingredient-editor__substitutions button {
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 650;
}
.ingredient-editor__substitutions button.is-selected {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 11%, var(--color-surface));
  color: var(--color-primary);
}
.ingredient-editor__substitutions p { margin: 0; color: var(--color-text-tertiary); }

.ingredient-editor__selection { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.ingredient-editor__selection > strong { width: 100%; color: var(--color-text-secondary); font-size: 0.78rem; }
.ingredient-editor__selection > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 7px 6px 10px;
  border-radius: var(--radius-full);
  background: var(--color-secondary);
  font-size: 0.8rem;
  font-weight: 650;
}
.ingredient-editor__selection button {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-danger);
  cursor: pointer;
  font: inherit;
  line-height: 1;
}

.ingredient-editor__actions {
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.ingredient-editor__actions > div { display: flex; gap: 9px; }

@media (max-width: 960px) {
  .ingredient-editor__layout { grid-template-columns: 1fr; }
  .ingredient-editor__nav { position: static; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .ingredient-editor__nav > span { display: none; }
}

@media (max-width: 620px) {
  .ingredient-editor__nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ingredient-editor__columns { grid-template-columns: 1fr; }
  .ingredient-editor__actions { align-items: stretch; flex-direction: column-reverse; }
  .ingredient-editor__actions > div { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
