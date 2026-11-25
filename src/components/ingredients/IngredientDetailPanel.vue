<script setup lang="ts">
import { computed, ref } from 'vue'
import AppToast from '@/components/atoms/AppToast.vue'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import RecipeAIProcessingOverlay from '@/components/organisms/RecipeAIProcessingOverlay.vue'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import {
  useGenerateIngredientImage,
  useIngredientRecipes,
  useRunIngredientEnrichment,
} from '@/composables/useCatalogQueries'
import { useRecipeAIProgress } from '@/composables/useRecipeAIProgress'
import { ingredientEnrichmentAgentService } from '@/services/ingredientEnrichmentAgentService'
import { useIngredientWishlistStore } from '@/stores/ingredientWishlistStore'
import type { Ingredient, Recipe } from '@/types/recipe'
import {
  ingredientDisplayMediaProfile,
  ingredientHasDisplayImage,
} from '@/utils/ingredientImagePreview'

const props = defineProps<{
  ingredient: Ingredient
  ingredientOptions?: Ingredient[]
}>()

const emit = defineEmits<{
  edit: []
  openRecipe: [recipe: Recipe]
  updated: [ingredient: Ingredient]
}>()

const monthLabels = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']
const ingredientUuid = computed(() => props.ingredient.uuid)
const { data: recipes, isLoading: isLoadingRecipes } = useIngredientRecipes(ingredientUuid)
const { mutate: runEnrichment, isPending: isEnriching } = useRunIngredientEnrichment()
const { mutate: generateImage, isPending: isGeneratingImage } = useGenerateIngredientImage()
const wishlist = useIngredientWishlistStore()
const notificationMessage = ref<string | null>(null)
const notificationTone = ref<'success' | 'warning' | 'error'>('success')
const {
  isVisible: showEnrichmentOverlay,
  stage: enrichmentStage,
  completedStages: completedEnrichmentStages,
  start: startEnrichmentProgress,
  complete: completeEnrichmentProgress,
  fail: failEnrichmentProgress,
} = useRecipeAIProgress(() => (
  ingredientEnrichmentAgentService.getRunningIngredientEnrichment(props.ingredient.uuid)
))

const mediaProfile = computed(() => ingredientDisplayMediaProfile(props.ingredient))
const hasImage = computed(() => ingredientHasDisplayImage(props.ingredient))
const isInWishlist = computed(() => wishlist.has(props.ingredient.uuid))
const optionNames = computed(() => new Map((props.ingredientOptions ?? []).map((item) => [item.uuid, item.name])))

const seasonalityLabel = computed(() => {
  const profile = props.ingredient.seasonality_profile
  if (profile.availability_type === 'year_round') return 'Toute l’année'
  if (profile.availability_type === 'not_applicable') return 'Non applicable'
  const months = Object.entries(profile.months)
    .filter(([, score]) => Number(score) > 0)
    .map(([month]) => monthLabels[Number(month) - 1])
    .filter(Boolean)
  return months.length ? months.join(', ') : 'Non renseignée'
})

const nutritionLabel = computed(() => {
  const profile = props.ingredient.nutrition_profile
  if (profile.kcal_per_100g != null) return `${profile.kcal_per_100g} kcal / 100 g`
  if (profile.kcal_per_100ml != null) return `${profile.kcal_per_100ml} kcal / 100 ml`
  return 'Non renseignée'
})

const nutritionDetail = computed(() => {
  const score = props.ingredient.nutrition_profile.nutri_score
  return ['unknown', 'not_applicable'].includes(score) ? null : `Nutri-Score ${score}`
})

const environmentLabel = computed(() => {
  const value = props.ingredient.sustainability_profile.carbon_kg_co2e_per_kg
  return value == null ? 'Non renseigné' : `${value} kg CO2e / kg`
})

const allergenLabel = computed(() => {
  const present = props.ingredient.allergen_profile.allergens.filter((item) => ['contains', 'may_contain'].includes(item.presence))
  return present.length ? present.map((item) => item.code).join(', ') : 'Aucun signalé'
})

const unitsLabel = computed(() => {
  const profile = props.ingredient.unit_profile
  const units = [profile.reference_unit !== 'unknown' ? profile.reference_unit : null, ...profile.allowed_units]
  return [...new Set(units.filter(Boolean))].join(', ') || 'Non renseignées'
})

const packagesLabel = computed(() =>
  props.ingredient.package_profiles.length
    ? props.ingredient.package_profiles.map((item) => `${item.label} · ${item.net_quantity} ${item.net_unit}`).join(' ; ')
    : 'Non renseignés',
)

const substitutionsLabel = computed(() => {
  const uuids = props.ingredient.substitution_profile.substitute_ingredient_uuids
  if (uuids.length) return uuids.map((uuid) => optionNames.value.get(uuid) ?? 'Ingrédient associé').join(', ')
  return props.ingredient.substitution_profile.default_policy === 'essential_by_default'
    ? 'Ingrédient essentiel'
    : 'Aucune renseignée'
})

const enrich = (): void => {
  notificationMessage.value = null
  startEnrichmentProgress()
  runEnrichment(props.ingredient.uuid, {
    onSuccess: (result) => {
      emit('updated', result.ingredient)
      completeEnrichmentProgress()
      notificationTone.value = result.run.warnings.length ? 'warning' : 'success'
      notificationMessage.value = result.run.warnings[0]
        ?? (result.run.proposed_fields.length
          ? result.run.image_generated
            ? 'La complétion et l’image sont terminées.'
            : 'La complétion est terminée.'
          : 'La fiche est déjà complète.')
    },
    onError: (error) => {
      failEnrichmentProgress()
      notificationTone.value = 'error'
      notificationMessage.value = error.message
    },
  })
}

const generate = (): void => {
  notificationMessage.value = null
  if (hasImage.value) {
    notificationTone.value = 'warning'
    notificationMessage.value = 'Cet ingrédient possède déjà une image.'
    return
  }
  generateImage(props.ingredient.uuid, {
    onSuccess: (result) => {
      emit('updated', result.ingredient)
      notificationTone.value = 'success'
      notificationMessage.value = 'L’image a été générée.'
    },
    onError: (error) => {
      notificationTone.value = 'error'
      notificationMessage.value = error.message
    },
  })
}
</script>

<template>
  <RecipeAIProcessingOverlay
    v-if="showEnrichmentOverlay"
    :stage="enrichmentStage"
    :completed-stages="completedEnrichmentStages"
    mode="ingredient"
    :subject="ingredient.name"
  />

  <AppToast :message="notificationMessage" :tone="notificationTone" @dismiss="notificationMessage = null" />

  <article class="ingredient-detail-panel">
    <section class="ingredient-detail-panel__hero">
      <figure class="ingredient-detail-panel__visual">
        <img v-if="mediaProfile.main_image_uri" :src="mediaProfile.main_image_uri" :alt="ingredient.name" />
        <div v-else class="ingredient-detail-panel__placeholder" aria-hidden="true">
          {{ ingredient.name.charAt(0).toLocaleUpperCase('fr-FR') }}
        </div>
        <span v-if="mediaProfile !== ingredient.media_profile" class="ingredient-detail-panel__image-status">Proposition IA</span>
      </figure>

      <div class="ingredient-detail-panel__intro">
        <div class="ingredient-detail-panel__title-line">
          <h1>{{ ingredient.name }}</h1>
          <span class="ingredient-detail-panel__score">{{ ingredient.enrichment_profile.completeness_score }}<small>%</small></span>
        </div>
        <div class="ingredient-detail-panel__chips">
          <span>{{ ingredient.group?.name || 'Sans groupe' }}</span>
          <span>{{ ingredient.rayon?.name || 'Sans rayon' }}</span>
          <span>{{ ingredient.unit_profile.reference_unit !== 'unknown' ? ingredient.unit_profile.reference_unit : ingredient.unit || 'Unité à définir' }}</span>
        </div>
        <div class="ingredient-detail-panel__actions">
          <button
            type="button"
            class="ingredient-detail-panel__wishlist"
            :class="{ 'is-active': isInWishlist }"
            :aria-pressed="isInWishlist"
            :title="isInWishlist ? 'Retirer de mes envies' : 'Ajouter à mes envies'"
            @click="wishlist.toggle(ingredient.uuid)"
          ><span aria-hidden="true">{{ isInWishlist ? '♥' : '♡' }}</span>Envie</button>
          <IconActionButton label="Compléter" :icon="isEnriching ? '…' : '✦'" :disabled="isEnriching" show-label pill @click="enrich" />
          <IconActionButton label="Générer" :icon="isGeneratingImage ? '…' : 'photo'" :disabled="isGeneratingImage || hasImage" show-label pill @click="generate" />
          <IconActionButton label="Modifier" icon="✎" show-label pill @click="$emit('edit')" />
        </div>
      </div>
    </section>

    <section class="ingredient-detail-panel__profiles" aria-label="Informations de l’ingrédient">
      <article>
        <span>Saisonnalité</span>
        <strong>{{ seasonalityLabel }}</strong>
        <small v-if="ingredient.seasonality_profile.geography">{{ ingredient.seasonality_profile.geography }}</small>
      </article>
      <article>
        <span>Nutrition</span>
        <strong>{{ nutritionLabel }}</strong>
        <small v-if="nutritionDetail">{{ nutritionDetail }}</small>
      </article>
      <article><span>Environnement</span><strong>{{ environmentLabel }}</strong></article>
      <article><span>Allergènes</span><strong>{{ allergenLabel }}</strong></article>
      <article><span>Unités</span><strong>{{ unitsLabel }}</strong></article>
      <article><span>Conditionnements</span><strong>{{ packagesLabel }}</strong></article>
      <article><span>Substitutions</span><strong>{{ substitutionsLabel }}</strong></article>
      <article class="ingredient-detail-panel__supplier"><span>Fournisseurs</span><strong>À venir</strong></article>
    </section>

    <section class="ingredient-detail-panel__section">
      <header class="ingredient-detail-panel__section-heading">
        <h2>Recettes</h2>
        <span>{{ recipes?.length ?? 0 }}</span>
      </header>
      <p v-if="isLoadingRecipes" class="ingredient-detail-panel__state">Chargement des recettes…</p>
      <p v-else-if="!recipes?.length" class="ingredient-detail-panel__state">Aucune recette associée.</p>
      <div v-else class="ingredient-detail-panel__recipes">
        <RecipeCard v-for="recipe in recipes" :key="recipe.uuid" :recipe="recipe" @click="$emit('openRecipe', recipe)" />
      </div>
    </section>
  </article>
</template>

<style scoped>
.ingredient-detail-panel {
  --ingredient-accent: #476a55;
  --ingredient-accent-soft: #edf4ef;
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: clamp(18px, 3vw, 40px);
  display: grid;
  gap: 24px;
}

.ingredient-detail-panel__hero {
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(380px, 1.25fr);
  min-height: 430px;
  border: 1px solid rgba(87, 83, 78, 0.14);
  border-radius: 24px;
  background: var(--color-surface);
  box-shadow: 0 18px 55px rgba(48, 43, 35, 0.1);
}

.ingredient-detail-panel__visual { position: relative; min-height: 360px; margin: 0; background: #e9eee9; }
.ingredient-detail-panel__visual img { width: 100%; height: 100%; display: block; object-fit: cover; }
.ingredient-detail-panel__placeholder {
  width: 100%; height: 100%; display: grid; place-items: center;
  background: radial-gradient(circle at 28% 25%, #d8eadf, transparent 33%), linear-gradient(145deg, #edf1ec, #e3e8ed);
  color: rgba(65, 71, 69, 0.48); font-size: clamp(6rem, 15vw, 12rem); font-weight: 700;
}
.ingredient-detail-panel__image-status {
  position: absolute; left: 14px; bottom: 14px; padding: 7px 10px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.9); color: var(--color-text-secondary); font-size: 0.74rem; font-weight: 800;
  backdrop-filter: blur(10px);
}

.ingredient-detail-panel__intro { display: flex; flex-direction: column; justify-content: center; padding: clamp(28px, 5vw, 68px); }
.ingredient-detail-panel__title-line { display: flex; align-items: start; justify-content: space-between; gap: 18px; }
.ingredient-detail-panel h1 { margin: 0; font-size: clamp(2.4rem, 5vw, 5rem); line-height: 0.96; letter-spacing: -0.05em; }
.ingredient-detail-panel__score {
  min-width: 62px; height: 62px; display: grid; place-content: center; border-radius: 999px;
  background: var(--ingredient-accent-soft); color: var(--ingredient-accent); font-size: 1.2rem; font-weight: 850;
}
.ingredient-detail-panel__score small { font-size: 0.64rem; text-align: center; }
.ingredient-detail-panel__chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 22px; }
.ingredient-detail-panel__chips span {
  padding: 7px 10px; border: 1px solid var(--color-border); border-radius: 999px;
  color: var(--color-text-secondary); font-size: 0.78rem; font-weight: 700;
}

.ingredient-detail-panel__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
.ingredient-detail-panel__wishlist {
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 10px 18px; border: 1px solid var(--ingredient-accent); border-radius: var(--radius-full);
  background: var(--ingredient-accent); color: #fff; cursor: pointer; font: inherit; font-size: 0.88rem; font-weight: 700;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--ingredient-accent) 22%, transparent);
}
.ingredient-detail-panel__wishlist:hover { transform: translateY(-1px); }
.ingredient-detail-panel__wishlist.is-active { background: #8f4052; border-color: #8f4052; }
.ingredient-detail-panel__wishlist span { font-size: 1rem; }
.ingredient-detail-panel__actions :deep(.icon-action--pill) {
  border-color: color-mix(in srgb, var(--ingredient-accent) 24%, var(--color-border));
  background: color-mix(in srgb, #fff 82%, transparent);
  color: var(--ingredient-accent);
}
.ingredient-detail-panel__actions :deep(.icon-action--pill:hover:not(:disabled)) {
  border-color: color-mix(in srgb, var(--ingredient-accent) 52%, var(--color-border));
  background: var(--ingredient-accent-soft);
}

.ingredient-detail-panel__profiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.ingredient-detail-panel__profiles article {
  min-width: 0; min-height: 116px; display: flex; flex-direction: column; gap: 9px; padding: 18px;
  border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); box-shadow: var(--shadow-sm);
}
.ingredient-detail-panel__profiles span { color: var(--color-text-tertiary); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
.ingredient-detail-panel__profiles strong { overflow-wrap: anywhere; font-size: 0.96rem; line-height: 1.4; }
.ingredient-detail-panel__profiles small { margin-top: auto; color: var(--color-text-tertiary); }
.ingredient-detail-panel__supplier { border-style: dashed !important; background: color-mix(in srgb, var(--color-secondary) 32%, var(--color-surface)) !important; }

.ingredient-detail-panel__section { padding: clamp(20px, 3vw, 30px); border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-surface); }
.ingredient-detail-panel__section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.ingredient-detail-panel__section-heading h2 { margin: 0; font-size: clamp(1.25rem, 3vw, 1.8rem); }
.ingredient-detail-panel__section-heading > span { min-width: 34px; height: 34px; display: grid; place-items: center; border-radius: 999px; background: var(--color-secondary); font-weight: 800; }
.ingredient-detail-panel__state { margin: 0; color: var(--color-text-secondary); }
.ingredient-detail-panel__recipes { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }

@media (max-width: 900px) { .ingredient-detail-panel__profiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) {
  .ingredient-detail-panel__hero { grid-template-columns: 1fr; }
  .ingredient-detail-panel__visual { min-height: 260px; aspect-ratio: 4 / 3; }
  .ingredient-detail-panel__intro { padding: 24px; }
}
@media (max-width: 480px) { .ingredient-detail-panel__profiles { grid-template-columns: 1fr; } }
</style>
