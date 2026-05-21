<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import IngredientCard from '@/components/ingredients/IngredientCard.vue'
import { useIngredientCatalogStore } from '@/stores/ingredientCatalogStore'
import type { Ingredient } from '@/types/recipe'

const props = withDefaults(defineProps<{
  disabled?: boolean
  modelValue?: string
}>(), {
  modelValue: '',
})

const emit = defineEmits<{
  (event: 'select', ingredient: Ingredient): void
  (event: 'update:modelValue', uuid: string): void
}>()

const search = ref('')
const ingredientCatalog = useIngredientCatalogStore()
ingredientCatalog.hydrateFromStorage()

const normalizeSearch = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
)

const ingredients = computed(() => {
  const query = normalizeSearch(search.value)
  if (!query) return ingredientCatalog.ingredients.slice(0, 72)

  const tokens = query.split(/\s+/).filter(Boolean)
  return ingredientCatalog.ingredients
    .filter((ingredient) => {
      const name = normalizeSearch(ingredient.name)
      return tokens.every((token) => name.includes(token))
    })
    .slice(0, 72)
})

const selectedUuid = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    emit('update:modelValue', value)
    const ingredient = ingredientCatalog.ingredients.find((item) => item.uuid === value)
    if (ingredient) {
      emit('select', ingredient)
    }
  },
})

const resultLabel = computed(() => {
  if (ingredientCatalog.loading && ingredientCatalog.ingredients.length === 0) return 'Chargement...'
  return `${ingredients.value.length} ingrédient${ingredients.value.length > 1 ? 's' : ''}`
})

const selectIngredient = (ingredient: Ingredient): void => {
  if (props.disabled || (ingredientCatalog.loading && ingredientCatalog.ingredients.length === 0)) return
  emit('update:modelValue', ingredient.uuid)
  emit('select', ingredient)
}

onMounted(() => {
  void ingredientCatalog.ensureLoaded()
})
</script>

<template>
  <div class="ingredient-picker" :class="{ 'ingredient-picker--disabled': disabled }">
    <div class="ingredient-picker__toolbar">
      <input
        v-model="search"
        type="search"
        placeholder="Rechercher un ingrédient"
        :disabled="disabled"
      />
      <span aria-live="polite">{{ resultLabel }}</span>
    </div>
    <span v-if="ingredientCatalog.error && ingredientCatalog.ingredients.length === 0" class="ingredient-picker__error">{{ ingredientCatalog.error }}</span>
    <p v-else-if="ingredientCatalog.loading && ingredientCatalog.ingredients.length === 0" class="ingredient-picker__empty">Chargement des ingrédients...</p>
    <p v-else-if="!ingredients.length" class="ingredient-picker__empty">Aucun ingrédient trouvé.</p>
    <div v-else class="ingredient-picker__grid">
      <IngredientCard
        v-for="ingredient in ingredients"
        :key="ingredient.uuid"
        :name="ingredient.name"
        :image-url="ingredient.media_profile.main_image_uri"
        :class="{ 'ingredient-picker__card--selected': selectedUuid === ingredient.uuid }"
        @click="selectIngredient(ingredient)"
      />
    </div>
  </div>
</template>

<style scoped>
.ingredient-picker {
  display: grid;
  gap: 10px;
  width: 100%;
}

.ingredient-picker--disabled {
  pointer-events: none;
  opacity: 0.6;
}

.ingredient-picker__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.ingredient-picker__toolbar span {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 650;
  white-space: nowrap;
}

.ingredient-picker input {
  min-width: 0;
  min-height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 0.92rem;
  padding: 6px 8px;
}

.ingredient-picker__grid {
  max-height: min(42vh, 420px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding: 2px 4px 4px 2px;
}

.ingredient-picker__grid :deep(.ingredient-card) {
  min-height: 176px;
  grid-template-rows: minmax(104px, 1fr) 72px;
}

.ingredient-picker__grid :deep(.ingredient-card__visual) {
  min-height: 104px;
  aspect-ratio: auto;
}

.ingredient-picker__grid :deep(.ingredient-card__body) {
  min-height: 72px;
  align-content: start;
}

.ingredient-picker__grid :deep(.ingredient-card__body h2) {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.92rem;
  line-height: 1.14;
  text-overflow: clip;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.ingredient-picker__card--selected {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.ingredient-picker__empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.ingredient-picker__error {
  color: var(--color-danger);
  font-size: 0.78rem;
}

@media (max-width: 520px) {
  .ingredient-picker__toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
