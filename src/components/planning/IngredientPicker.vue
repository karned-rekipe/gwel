<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ingredientService } from '@/services/ingredientService'
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
const ingredients = ref<Ingredient[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const selectedUuid = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    emit('update:modelValue', value)
    const ingredient = ingredients.value.find((item) => item.uuid === value)
    if (ingredient) {
      emit('select', ingredient)
    }
  },
})

const loadIngredients = async (): Promise<void> => {
  loading.value = true
  error.value = null
  try {
    const response = await ingredientService.getPage({
      name: search.value.trim() || undefined,
      page: 1,
      per_page: 50,
    })
    ingredients.value = response.data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chargement des ingrédients impossible.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadIngredients()
})
</script>

<template>
  <div class="ingredient-picker">
    <input
      v-model="search"
      type="search"
      placeholder="Rechercher un ingrédient"
      :disabled="disabled || loading"
      @change="loadIngredients"
    />
    <select v-model="selectedUuid" :disabled="disabled || loading || ingredients.length === 0" required>
      <option value="">Ingrédient</option>
      <option v-for="ingredient in ingredients" :key="ingredient.uuid" :value="ingredient.uuid">
        {{ ingredient.name }}
      </option>
    </select>
    <span v-if="error" class="ingredient-picker__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.ingredient-picker {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) minmax(140px, 1.4fr);
  gap: 6px;
  width: 100%;
}

.ingredient-picker input,
.ingredient-picker select {
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

.ingredient-picker__error {
  grid-column: 1 / -1;
  color: var(--color-danger);
  font-size: 0.78rem;
}

@media (max-width: 520px) {
  .ingredient-picker {
    grid-template-columns: 1fr;
  }
}
</style>
