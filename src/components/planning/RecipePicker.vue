<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import ResourceSearchBar from '@/components/resources/ResourceSearchBar.vue'
import { useRecipeCatalogStore } from '@/stores/recipeCatalogStore'
import type { Recipe } from '@/types/recipe'
import { countryNameFrom } from '@/utils/countryFlags'

const props = withDefaults(defineProps<{ disabled?: boolean; buttonLabel?: string }>(), {
  buttonLabel: 'Ajouter',
})

const emit = defineEmits<{ (event: 'select', recipe: Recipe): void }>()

const recipeCatalog = useRecipeCatalogStore()
const search = ref('')
const MONTH_LABELS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
]

const normalizeSearch = (value?: string | number | null): string => (
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
)

const totalTimeFor = (recipe: Recipe): number => (
  recipe.steps.reduce((total, step) => {
    const stepTime =
      step.total_time ??
      (step.preparation_time ?? 0) + (step.cooking_time ?? 0) + (step.rest_time ?? 0)
    return total + stepTime
  }, 0)
)

const difficultyKeywords = (difficulty?: number | null): string => {
  if (!difficulty) return ''
  if (difficulty <= 2) return 'facile simple'
  if (difficulty <= 3) return 'intermediaire moyen'
  return 'difficile technique'
}

const priceKeywords = (price?: number | null): string => {
  if (!price) return ''
  if (price <= 2) return 'economique pas cher prix bas'
  if (price <= 3) return 'prix moyen'
  return 'cher prix eleve'
}

const timeKeywords = (minutes: number): string => {
  if (!minutes) return ''
  if (minutes <= 30) return 'rapide moins 30 min'
  if (minutes <= 60) return 'moins une heure'
  return 'long'
}

const seasonKeywords = (recipe: Recipe): string => (
  Object.entries(recipe.season_months ?? {})
    .filter(([, value]) => Number(value) > 0)
    .map(([month]) => MONTH_LABELS[Number(month) - 1])
    .filter(Boolean)
    .join(' ')
)

const searchTextFor = (recipe: Recipe): string => normalizeSearch([
  recipe.name,
  recipe.description,
  recipe.origin_country,
  countryNameFrom(recipe.origin_country),
  recipe.servings ? `${recipe.servings} personne personnes pax` : '',
  recipe.favorite ? 'favori favorite' : '',
  recipe.tags.map((tag) => tag.name).join(' '),
  recipe.ingredients.map((ingredient) => ingredient.name).join(' '),
  recipe.equipment.map((equipment) => equipment.name).join(' '),
  difficultyKeywords(recipe.difficulty),
  priceKeywords(recipe.price),
  timeKeywords(totalTimeFor(recipe)),
  seasonKeywords(recipe),
].filter(Boolean).join(' '))

const searchIndexByUuid = computed(() => new Map(
  recipeCatalog.recipes.map((recipe) => [recipe.uuid, searchTextFor(recipe)]),
))

const searchTokens = computed(() => (
  normalizeSearch(search.value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
))

const filteredRecipes = computed(() => {
  const tokens = searchTokens.value
  if (!tokens.length) return recipeCatalog.recipes
  return recipeCatalog.recipes.filter((recipe) => {
    const searchText = searchIndexByUuid.value.get(recipe.uuid) ?? ''
    return tokens.every((token) => searchText.includes(token))
  })
})

const resultLabel = computed(() => {
  const count = filteredRecipes.value.length
  if (recipeCatalog.loading && recipeCatalog.recipes.length === 0) return 'Chargement des recettes...'
  return `${count} recette${count > 1 ? 's' : ''}`
})

const selectRecipe = (recipe: Recipe): void => {
  if (props.disabled || (recipeCatalog.loading && recipeCatalog.recipes.length === 0)) return
  emit('select', recipe)
}

onMounted(() => {
  void recipeCatalog.ensureLoaded()
})
</script>

<template>
  <section class="recipe-picker" :class="{ 'recipe-picker--disabled': disabled }">
    <div class="recipe-picker__toolbar">
      <ResourceSearchBar v-model="search" placeholder="Rechercher une recette" />
      <span class="recipe-picker__count" aria-live="polite">{{ resultLabel }}</span>
    </div>

    <p v-if="recipeCatalog.error && recipeCatalog.recipes.length === 0" class="recipe-picker__message recipe-picker__message--error">
      {{ recipeCatalog.error }}
    </p>
    <p v-else-if="recipeCatalog.loading && recipeCatalog.recipes.length === 0" class="recipe-picker__message">Chargement des recettes...</p>
    <p v-else-if="filteredRecipes.length === 0" class="recipe-picker__message">
      Aucune recette trouvée.
    </p>

    <div v-else class="recipe-picker__grid">
      <RecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe.uuid"
        :recipe="recipe"
        @click="selectRecipe(recipe)"
      />
    </div>
  </section>
</template>

<style scoped>
.recipe-picker {
  display: grid;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.recipe-picker--disabled {
  pointer-events: none;
  opacity: 0.62;
}

.recipe-picker__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.recipe-picker__count {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
  white-space: nowrap;
}

.recipe-picker__grid {
  min-height: 0;
  max-height: min(58vh, 560px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 2px 4px 4px 2px;
  scrollbar-gutter: stable;
}

.recipe-picker__grid :deep(.recipe-card) {
  min-height: 242px;
}

.recipe-picker__message {
  margin: 0;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.recipe-picker__message--error {
  border-color: color-mix(in srgb, var(--color-danger) 36%, var(--color-border));
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
}

@media (max-width: 640px) {
  .recipe-picker__toolbar {
    grid-template-columns: 1fr;
  }

  .recipe-picker__grid {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    max-height: min(60vh, 520px);
  }
}
</style>
