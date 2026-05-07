<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { recipeService } from '@/services/recipeService'
import type { Recipe } from '@/types/recipe'

withDefaults(defineProps<{ disabled?: boolean; buttonLabel?: string }>(), {
  buttonLabel: 'Ajouter',
})

const emit = defineEmits<{ (event: 'select', recipe: Recipe): void }>()

const search = ref('')
const recipes = ref<Recipe[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const selectedUuid = ref('')

const loadRecipes = async (): Promise<void> => {
  loading.value = true
  error.value = null
  try {
    const response = await recipeService.listEligibleRecipes({
      search: search.value.trim() || undefined,
      page: 1,
      page_size: 30,
    })
    recipes.value = response.data
    selectedUuid.value = response.data[0]?.uuid ?? ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chargement des recettes impossible.'
  } finally {
    loading.value = false
  }
}

const selectRecipe = (): void => {
  if (!selectedUuid.value) return
  const recipe = recipes.value.find((item) => item.uuid === selectedUuid.value)
  if (recipe) emit('select', recipe)
}

onMounted(() => {
  void loadRecipes()
})
</script>

<template>
  <form class="recipe-picker" @submit.prevent="selectRecipe">
    <input
      v-model="search"
      type="search"
      placeholder="Recette"
      :disabled="disabled || loading"
      @change="loadRecipes"
    />
    <select v-model="selectedUuid" :disabled="disabled || loading || recipes.length === 0">
      <option value="">Recette</option>
      <option v-for="recipe in recipes" :key="recipe.uuid" :value="recipe.uuid">
        {{ recipe.name }}
      </option>
    </select>
    <button type="submit" :disabled="disabled || loading || !selectedUuid">{{ buttonLabel }}</button>
    <span v-if="error" class="recipe-picker__error">{{ error }}</span>
  </form>
</template>

<style scoped>
.recipe-picker {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) minmax(120px, 1.4fr) auto;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.recipe-picker input,
.recipe-picker select,
.recipe-picker button {
  min-height: 30px;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 0.86rem;
}

.recipe-picker input,
.recipe-picker select {
  padding: 5px 7px;
}

.recipe-picker button {
  padding: 5px 8px;
  cursor: pointer;
}

.recipe-picker__error {
  grid-column: 1 / -1;
  color: var(--color-danger);
  font-size: 0.78rem;
}

@media (max-width: 520px) {
  .recipe-picker {
    grid-template-columns: 1fr;
  }
}
</style>
