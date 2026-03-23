<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCreateRecipe } from '@/composables/useRecipeQueries'
import { useRecipeValidation, useRecipeFormatter } from '@/composables/useRecipe'
import type { RecipeFormData } from '@/types/recipe'
import AppInput from '@/components/atoms/AppInput.vue'
import AppButton from '@/components/atoms/AppButton.vue'

const router = useRouter()
const { normalizeFormData } = useRecipeFormatter()

// Vue Query - Mutation pour créer une recette
const { mutate: createRecipe, isPending, isError, error } = useCreateRecipe()

// État du formulaire
const formData = reactive<RecipeFormData>({
  name: '',
  description: '',
  ingredients: [{ name: '', unit: '' }],
  steps: [{ name: '', description: '' }],
  utensils: [{ name: '' }]
})

const { isFormValid } = useRecipeValidation(ref(formData))

// Gestion des ingrédients
const addIngredient = (): void => {
  formData.ingredients.push({ name: '', unit: '' })
}

const removeIngredient = (index: number): void => {
  if (formData.ingredients.length > 1) {
    formData.ingredients.splice(index, 1)
  }
}

// Gestion des étapes
const addStep = (): void => {
  formData.steps.push({
    name: '',
    description: ''
  })
}

const removeStep = (index: number): void => {
  if (formData.steps.length > 1) {
    formData.steps.splice(index, 1)
  }
}

// Gestion des ustensiles
const addUtensil = (): void => {
  formData.utensils.push({ name: '' })
}

const removeUtensil = (index: number): void => {
  formData.utensils.splice(index, 1)
}

// Soumission du formulaire avec Vue Query
const handleSubmit = (): void => {
  if (!isFormValid.value) return

  const normalizedData = normalizeFormData(formData)

  createRecipe(
    {
      recipe: {
        name: normalizedData.name,
        description: normalizedData.description
      },
      ingredients: normalizedData.ingredients,
      steps: normalizedData.steps,
      utensils: normalizedData.utensils
    },
    {
      onSuccess: () => {
        // Redirection après succès
        router.push({ name: 'home' })
      }
    }
  )
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
          id="recipe-name"
          v-model="formData.name"
          label="Nom de la recette"
          placeholder="Ex: Pâtes Carbonara"
          required
        />

        <div class="recipe-form__field">
          <label for="recipe-description" class="recipe-form__label">
            Description
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
              :id="`ingredient-unit-${index}`"
              v-model="ingredient.unit"
              label="Unité (quantité + unité)"
              placeholder="Ex: 400g"
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
            <div class="recipe-form__step-number">{{ index + 1 }}</div>
            <div class="recipe-form__step-fields">
              <AppInput
                :id="`step-name-${index}`"
                v-model="step.name"
                label="Titre de l'étape"
                placeholder="Ex: Préparer la pâte"
                required
              />

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

      <!-- Affichage des erreurs de mutation -->
      <div v-if="isError" class="recipe-form__error" role="alert">
        <p class="recipe-form__error-message">
          ❌ {{ error?.message || 'Erreur lors de la création de la recette' }}
        </p>
      </div>

      <!-- Actions -->
      <div class="recipe-form__actions">
        <AppButton type="button" variant="secondary" :disabled="isPending" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="!isFormValid || isPending">
          {{ isPending ? 'Création en cours...' : 'Créer la recette' }}
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

/* Erreur de mutation */
.recipe-form__error {
  background-color: #fee;
  border: 1px solid var(--color-danger, #dc3545);
  border-radius: 8px;
  padding: 16px;
}

.recipe-form__error-message {
  font-size: 1rem;
  color: var(--color-danger, #dc3545);
  margin: 0;
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
