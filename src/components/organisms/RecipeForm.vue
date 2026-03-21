<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipeStore } from '@/stores/recipeStore'
import { useRecipeValidation, useRecipeFormatter } from '@/composables/useRecipe'
import type { RecipeFormData } from '@/types/recipe'
import AppInput from '@/components/atoms/AppInput.vue'
import AppButton from '@/components/atoms/AppButton.vue'

const router = useRouter()
const recipeStore = useRecipeStore()
const { normalizeFormData } = useRecipeFormatter()

// État du formulaire
const formData = reactive<RecipeFormData>({
  title: '',
  shortDescription: '',
  description: '',
  prepTime: 0,
  cookTime: 0,
  servings: 1,
  imageUrl: '',
  ingredients: [{ name: '', quantity: '', unit: '' }],
  steps: [{ order: 1, description: '', duration: undefined }],
  utensils: [{ name: '' }]
})

const { isFormValid } = useRecipeValidation(ref(formData))

// Gestion des ingrédients
const addIngredient = (): void => {
  formData.ingredients.push({ name: '', quantity: '', unit: '' })
}

const removeIngredient = (index: number): void => {
  if (formData.ingredients.length > 1) {
    formData.ingredients.splice(index, 1)
  }
}

// Gestion des étapes
const addStep = (): void => {
  formData.steps.push({
    order: formData.steps.length + 1,
    description: '',
    duration: undefined
  })
}

const removeStep = (index: number): void => {
  if (formData.steps.length > 1) {
    formData.steps.splice(index, 1)
    // Réorganiser les numéros d'ordre
    formData.steps.forEach((step, i) => {
      step.order = i + 1
    })
  }
}

// Gestion des ustensiles
const addUtensil = (): void => {
  formData.utensils.push({ name: '' })
}

const removeUtensil = (index: number): void => {
  formData.utensils.splice(index, 1)
}

// Soumission du formulaire
const handleSubmit = (): void => {
  if (!isFormValid.value) {
    return
  }

  const normalizedData = normalizeFormData(formData)
  recipeStore.addRecipe(normalizedData)
  router.push({ name: 'home' })
}

const handleCancel = (): void => {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="recipe-form">
    <header class="recipe-form__header">
      <h1 class="recipe-form__title">Nouvelle Recette</h1>
      <p class="recipe-form__subtitle">Partagez votre recette préférée avec la communauté</p>
    </header>

    <form class="recipe-form__form" @submit.prevent="handleSubmit">
      <!-- Informations de base -->
      <section class="recipe-form__section">
        <h2 class="recipe-form__section-title">Informations générales</h2>

        <AppInput
          id="recipe-title"
          v-model="formData.title"
          label="Titre de la recette"
          placeholder="Ex: Pâtes Carbonara"
          required
        />

        <AppInput
          id="recipe-short-description"
          v-model="formData.shortDescription"
          label="Description courte"
          placeholder="Ex: Pâtes italiennes crémeuses aux œufs et guanciale"
          required
        />

        <div class="recipe-form__field">
          <label for="recipe-description" class="recipe-form__label">
            Description détaillée
            <span class="recipe-form__required" aria-label="Champ requis">*</span>
          </label>
          <textarea
            id="recipe-description"
            v-model="formData.description"
            class="recipe-form__textarea"
            placeholder="Décrivez votre recette en détail..."
            rows="4"
            required
          ></textarea>
        </div>

        <AppInput
          id="recipe-image"
          :model-value="formData.imageUrl ?? ''"
          label="URL de l'image (optionnel)"
          type="text"
          placeholder="https://example.com/image.jpg"
          @update:model-value="formData.imageUrl = $event || undefined"
        />
      </section>

      <!-- Temps et portions -->
      <section class="recipe-form__section">
        <h2 class="recipe-form__section-title">Temps et portions</h2>

        <div class="recipe-form__row">
          <AppInput
            id="recipe-prep-time"
            :model-value="String(formData.prepTime)"
            label="Temps de préparation (min)"
            type="number"
            required
            @update:model-value="formData.prepTime = Number($event)"
          />

          <AppInput
            id="recipe-cook-time"
            :model-value="String(formData.cookTime)"
            label="Temps de cuisson (min)"
            type="number"
            required
            @update:model-value="formData.cookTime = Number($event)"
          />

          <AppInput
            id="recipe-servings"
            :model-value="String(formData.servings)"
            label="Nombre de portions"
            type="number"
            required
            @update:model-value="formData.servings = Number($event)"
          />
        </div>
      </section>

      <!-- Ingrédients -->
      <section class="recipe-form__section">
        <h2 class="recipe-form__section-title">Ingrédients</h2>

        <div
          v-for="(ingredient, index) in formData.ingredients"
          :key="index"
          class="recipe-form__dynamic-item"
        >
          <div class="recipe-form__row recipe-form__row--ingredient">
            <AppInput
              :id="`ingredient-name-${index}`"
              v-model="ingredient.name"
              label="Nom"
              placeholder="Ex: Spaghetti"
              required
            />

            <AppInput
              :id="`ingredient-quantity-${index}`"
              v-model="ingredient.quantity"
              label="Quantité"
              placeholder="Ex: 400"
              required
            />

            <AppInput
              :id="`ingredient-unit-${index}`"
              v-model="ingredient.unit"
              label="Unité"
              placeholder="Ex: g"
              required
            />
          </div>

          <AppButton
            v-if="formData.ingredients.length > 1"
            variant="danger"
            aria-label="Supprimer cet ingrédient"
            @click="removeIngredient(index)"
          >
            ✕
          </AppButton>
        </div>

        <AppButton variant="secondary" @click="addIngredient">
          ➕ Ajouter un ingrédient
        </AppButton>
      </section>

      <!-- Étapes -->
      <section class="recipe-form__section">
        <h2 class="recipe-form__section-title">Étapes de préparation</h2>

        <div v-for="(step, index) in formData.steps" :key="index" class="recipe-form__dynamic-item">
          <div class="recipe-form__step">
            <div class="recipe-form__step-number">{{ step.order }}</div>
            <div class="recipe-form__step-fields">
              <div class="recipe-form__field">
                <label :for="`step-description-${index}`" class="recipe-form__label">
                  Description
                  <span class="recipe-form__required" aria-label="Champ requis">*</span>
                </label>
                <textarea
                  :id="`step-description-${index}`"
                  v-model="step.description"
                  class="recipe-form__textarea"
                  placeholder="Décrivez cette étape..."
                  rows="3"
                  required
                ></textarea>
              </div>

              <AppInput
                :id="`step-duration-${index}`"
                :model-value="step.duration !== undefined ? String(step.duration) : ''"
                label="Durée (min, optionnel)"
                type="number"
                @update:model-value="step.duration = $event ? Number($event) : undefined"
              />
            </div>
          </div>

          <AppButton
            v-if="formData.steps.length > 1"
            variant="danger"
            aria-label="Supprimer cette étape"
            @click="removeStep(index)"
          >
            ✕
          </AppButton>
        </div>

        <AppButton variant="secondary" @click="addStep">
          ➕ Ajouter une étape
        </AppButton>
      </section>

      <!-- Ustensiles -->
      <section class="recipe-form__section">
        <h2 class="recipe-form__section-title">Ustensiles (optionnel)</h2>

        <div
          v-for="(utensil, index) in formData.utensils"
          :key="index"
          class="recipe-form__dynamic-item"
        >
          <AppInput
            :id="`utensil-name-${index}`"
            v-model="utensil.name"
            label="Nom de l'ustensile"
            placeholder="Ex: Grande casserole"
          />

          <AppButton
            variant="danger"
            aria-label="Supprimer cet ustensile"
            @click="removeUtensil(index)"
          >
            ✕
          </AppButton>
        </div>

        <AppButton variant="secondary" @click="addUtensil">
          ➕ Ajouter un ustensile
        </AppButton>
      </section>

      <!-- Actions -->
      <div class="recipe-form__actions">
        <AppButton type="button" variant="secondary" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="!isFormValid">
          Créer la recette
        </AppButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.recipe-form {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

/* En-tête */
.recipe-form__header {
  margin-bottom: 32px;
}

.recipe-form__title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 8px 0;
}

.recipe-form__subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary, #718096);
  margin: 0;
}

/* Formulaire */
.recipe-form__form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Sections */
.recipe-form__section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipe-form__section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 8px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
}

/* Champs */
.recipe-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-form__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary, #2c3e50);
}

.recipe-form__required {
  color: var(--color-danger, #dc3545);
  margin-left: 4px;
}

.recipe-form__textarea {
  min-height: 44px;
  padding: 12px 16px;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  border: 2px solid var(--color-border, #cbd5e0);
  border-radius: 8px;
  background-color: var(--color-background, #ffffff);
  color: var(--color-text-primary, #2c3e50);
  transition: all 0.2s ease-in-out;
  resize: vertical;
  outline: none;
}

.recipe-form__textarea:focus {
  border-color: var(--color-primary, #4a90e2);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.recipe-form__textarea:focus-visible {
  outline: 2px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
}

/* Row layout */
.recipe-form__row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.recipe-form__row--ingredient {
  grid-template-columns: 2fr 1fr 1fr;
}

/* Items dynamiques */
.recipe-form__dynamic-item {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 16px;
  background-color: var(--color-background-alt, #f7fafc);
  border-radius: 8px;
}

.recipe-form__dynamic-item > *:first-child {
  flex: 1;
}

/* Étapes */
.recipe-form__step {
  flex: 1;
  display: flex;
  gap: 16px;
}

.recipe-form__step-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary, #4a90e2);
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  border-radius: 50%;
}

.recipe-form__step-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Actions */
.recipe-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
}

/* Responsive */
@media (min-width: 640px) {
  .recipe-form {
    padding: 32px;
  }

  .recipe-form__row {
    grid-template-columns: repeat(3, 1fr);
  }

  .recipe-form__section {
    padding: 32px;
  }
}

@media (max-width: 639px) {
  .recipe-form__row--ingredient {
    grid-template-columns: 1fr;
  }

  .recipe-form__dynamic-item {
    flex-direction: column;
    align-items: stretch;
  }

  .recipe-form__step {
    flex-direction: column;
  }

  .recipe-form__actions {
    flex-direction: column;
  }
}
</style>
