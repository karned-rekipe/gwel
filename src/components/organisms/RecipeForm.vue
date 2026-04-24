<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import { useRecipeFormatter, useRecipeValidation } from '@/composables/useRecipe'
import { useCreateRecipe } from '@/composables/useRecipeQueries'
import type {
  RecipeFormData,
  RecipeFormEquipment,
  RecipeFormIngredient,
  RecipeFormSource,
  RecipeFormStep,
} from '@/types/recipe'

const monthOptions = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fév' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Avr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juil' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Déc' },
]

const createEmptyIngredient = (): RecipeFormIngredient => ({
  name: '',
  quantity: '',
  unit: '',
  seasonMonths: [],
  rayon: '',
  group: '',
  greenScore: '',
})

const createEmptyEquipment = (): RecipeFormEquipment => ({
  name: '',
  quantity: '',
})

const createEmptyStep = (): RecipeFormStep => ({
  name: '',
  description: '',
  preparationTime: '',
  cookingTime: '',
  restTime: '',
})

const createEmptySource = (): RecipeFormSource => ({
  name: '',
  description: '',
  uri: '',
})

const router = useRouter()
const { mutate: createRecipe, isPending, isError, error } = useCreateRecipe()
const { normalizeFormData } = useRecipeFormatter()

const formData = reactive<RecipeFormData>({
  name: '',
  description: '',
  servings: '4',
  mainImage: '',
  secondaryImages: '',
  ingredients: [createEmptyIngredient()],
  equipment: [createEmptyEquipment()],
  steps: [createEmptyStep()],
  sources: [createEmptySource()],
})

const { isFormValid } = useRecipeValidation(formData)

const toggleSeasonMonth = (ingredient: RecipeFormIngredient, month: number): void => {
  if (ingredient.seasonMonths.includes(month)) {
    ingredient.seasonMonths = ingredient.seasonMonths.filter((value) => value !== month)
    return
  }

  ingredient.seasonMonths = [...ingredient.seasonMonths, month].sort((left, right) => left - right)
}

const addIngredient = (): void => {
  formData.ingredients.push(createEmptyIngredient())
}

const removeIngredient = (index: number): void => {
  if (formData.ingredients.length > 1) {
    formData.ingredients.splice(index, 1)
  }
}

const addEquipment = (): void => {
  formData.equipment.push(createEmptyEquipment())
}

const removeEquipment = (index: number): void => {
  if (formData.equipment.length > 1) {
    formData.equipment.splice(index, 1)
  }
}

const addStep = (): void => {
  formData.steps.push(createEmptyStep())
}

const removeStep = (index: number): void => {
  if (formData.steps.length > 1) {
    formData.steps.splice(index, 1)
  }
}

const addSource = (): void => {
  formData.sources.push(createEmptySource())
}

const removeSource = (index: number): void => {
  if (formData.sources.length > 1) {
    formData.sources.splice(index, 1)
  }
}

const handleCancel = (): void => {
  router.push({ name: 'recipes-home' })
}

const handleSubmit = (): void => {
  if (!isFormValid.value) return

  createRecipe(normalizeFormData(formData), {
    onSuccess: ({ uuid }) => {
      router.push({ name: 'recipes-detail', params: { id: uuid } })
    },
  })
}
</script>

<template>
  <section class="recipe-form">
    <form class="recipe-form__form" @submit.prevent="handleSubmit">
      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Informations générales</h2>
          <p class="recipe-form__section-text">Nom, portions et images URI de la recette.</p>
        </div>

        <div class="recipe-form__grid recipe-form__grid--two">
          <AppInput
            id="recipe-name"
            v-model="formData.name"
            label="Nom de la recette"
            placeholder="Ex. dhal de lentilles"
            required
          />
          <AppInput
            id="recipe-servings"
            v-model="formData.servings"
            type="number"
            label="Nombre de portions"
            placeholder="4"
            required
          />
        </div>

        <div class="recipe-form__field">
          <label for="recipe-description" class="recipe-form__label">Description</label>
          <textarea
            id="recipe-description"
            v-model="formData.description"
            class="recipe-form__textarea"
            rows="4"
            placeholder="Contexte, intention culinaire, contraintes ou notes utiles."
          ></textarea>
        </div>

        <div class="recipe-form__grid recipe-form__grid--two">
          <AppInput
            id="recipe-main-image"
            v-model="formData.mainImage"
            label="Image principale (URI)"
            placeholder="https://..."
          />
          <AppInput
            id="recipe-secondary-images"
            v-model="formData.secondaryImages"
            label="Images secondaires (URI séparées par des virgules)"
            placeholder="https://..., https://..."
          />
        </div>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Ingrédients</h2>
          <p class="recipe-form__section-text">
            Chaque ingrédient doit porter une quantité, une unité et une saisonnalité.
          </p>
        </div>

        <div
          v-for="(ingredient, index) in formData.ingredients"
          :key="`ingredient-${index}`"
          class="recipe-form__item-card"
        >
          <div class="recipe-form__item-head">
            <h3 class="recipe-form__item-title">Ingrédient {{ index + 1 }}</h3>
            <AppButton
              v-if="formData.ingredients.length > 1"
              variant="danger"
              @click="removeIngredient(index)"
            >
              Retirer
            </AppButton>
          </div>

          <div class="recipe-form__grid recipe-form__grid--three">
            <AppInput
              :id="`ingredient-name-${index}`"
              v-model="ingredient.name"
              label="Nom"
              placeholder="Ex. lentilles corail"
              required
            />
            <AppInput
              :id="`ingredient-quantity-${index}`"
              v-model="ingredient.quantity"
              type="number"
              label="Quantité"
              placeholder="300"
              required
            />
            <AppInput
              :id="`ingredient-unit-${index}`"
              v-model="ingredient.unit"
              label="Unité"
              placeholder="g"
              required
            />
          </div>

          <div class="recipe-form__grid recipe-form__grid--three">
            <AppInput
              :id="`ingredient-group-${index}`"
              v-model="ingredient.group"
              label="Groupe"
              placeholder="Légumineuses"
            />
            <AppInput
              :id="`ingredient-rayon-${index}`"
              v-model="ingredient.rayon"
              label="Rayon"
              placeholder="Épicerie"
            />
            <AppInput
              :id="`ingredient-green-score-${index}`"
              v-model="ingredient.greenScore"
              type="number"
              label="Green score"
              placeholder="80"
            />
          </div>

          <div class="recipe-form__field">
            <span class="recipe-form__label">Saisonnalité</span>
            <div class="recipe-form__months">
              <button
                v-for="month in monthOptions"
                :key="`${index}-${month.value}`"
                type="button"
                class="recipe-form__month"
                :class="{ 'recipe-form__month--active': ingredient.seasonMonths.includes(month.value) }"
                @click="toggleSeasonMonth(ingredient, month.value)"
              >
                {{ month.label }}
              </button>
            </div>
          </div>
        </div>

        <AppButton variant="secondary" @click="addIngredient">Ajouter un ingrédient</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Équipement</h2>
          <p class="recipe-form__section-text">Optionnel, mais utile pour une fiche complète.</p>
        </div>

        <div
          v-for="(equipment, index) in formData.equipment"
          :key="`equipment-${index}`"
          class="recipe-form__item-card"
        >
          <div class="recipe-form__item-head">
            <h3 class="recipe-form__item-title">Équipement {{ index + 1 }}</h3>
            <AppButton
              v-if="formData.equipment.length > 1"
              variant="danger"
              @click="removeEquipment(index)"
            >
              Retirer
            </AppButton>
          </div>

          <div class="recipe-form__grid recipe-form__grid--two">
            <AppInput
              :id="`equipment-name-${index}`"
              v-model="equipment.name"
              label="Nom"
              placeholder="Cocotte"
            />
            <AppInput
              :id="`equipment-quantity-${index}`"
              v-model="equipment.quantity"
              type="number"
              label="Quantité"
              placeholder="1"
            />
          </div>
        </div>

        <AppButton variant="secondary" @click="addEquipment">Ajouter un équipement</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Étapes</h2>
          <p class="recipe-form__section-text">
            Les durées sont facultatives, mais la description détaillée reste obligatoire.
          </p>
        </div>

        <div
          v-for="(step, index) in formData.steps"
          :key="`step-${index}`"
          class="recipe-form__item-card"
        >
          <div class="recipe-form__item-head">
            <h3 class="recipe-form__item-title">Étape {{ index + 1 }}</h3>
            <AppButton
              v-if="formData.steps.length > 1"
              variant="danger"
              @click="removeStep(index)"
            >
              Retirer
            </AppButton>
          </div>

          <AppInput
            :id="`step-name-${index}`"
            v-model="step.name"
            label="Titre"
            placeholder="Préparer les légumes"
            required
          />

          <div class="recipe-form__field">
            <label :for="`step-description-${index}`" class="recipe-form__label">Description</label>
            <textarea
              :id="`step-description-${index}`"
              v-model="step.description"
              class="recipe-form__textarea"
              rows="4"
              placeholder="Décris précisément cette étape."
            ></textarea>
          </div>

          <div class="recipe-form__grid recipe-form__grid--three">
            <AppInput
              :id="`step-preparation-${index}`"
              v-model="step.preparationTime"
              type="number"
              label="Temps de préparation (min)"
              placeholder="15"
            />
            <AppInput
              :id="`step-cooking-${index}`"
              v-model="step.cookingTime"
              type="number"
              label="Temps de cuisson (min)"
              placeholder="25"
            />
            <AppInput
              :id="`step-rest-${index}`"
              v-model="step.restTime"
              type="number"
              label="Temps de repos (min)"
              placeholder="60"
            />
          </div>
        </div>

        <AppButton variant="secondary" @click="addStep">Ajouter une étape</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Sources</h2>
          <p class="recipe-form__section-text">
            Optionnel. Permet de garder la trace de l’origine de la recette.
          </p>
        </div>

        <div
          v-for="(source, index) in formData.sources"
          :key="`source-${index}`"
          class="recipe-form__item-card"
        >
          <div class="recipe-form__item-head">
            <h3 class="recipe-form__item-title">Source {{ index + 1 }}</h3>
            <AppButton
              v-if="formData.sources.length > 1"
              variant="danger"
              @click="removeSource(index)"
            >
              Retirer
            </AppButton>
          </div>

          <div class="recipe-form__grid recipe-form__grid--two">
            <AppInput
              :id="`source-name-${index}`"
              v-model="source.name"
              label="Nom"
              placeholder="Carnet familial"
            />
            <AppInput
              :id="`source-uri-${index}`"
              v-model="source.uri"
              label="URI"
              placeholder="https://..."
            />
          </div>

          <div class="recipe-form__field">
            <label :for="`source-description-${index}`" class="recipe-form__label">Description</label>
            <textarea
              :id="`source-description-${index}`"
              v-model="source.description"
              class="recipe-form__textarea"
              rows="3"
              placeholder="Contexte ou précision sur la source."
            ></textarea>
          </div>
        </div>

        <AppButton variant="secondary" @click="addSource">Ajouter une source</AppButton>
      </section>

      <div v-if="isError" class="recipe-form__error" role="alert">
        {{ error?.message || 'La création de la recette a échoué.' }}
      </div>

      <div class="recipe-form__actions">
        <AppButton type="button" variant="secondary" :disabled="isPending" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="!isFormValid || isPending">
          {{ isPending ? 'Création en cours…' : 'Créer la recette' }}
        </AppButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.recipe-form {
  max-width: 1040px;
}

.recipe-form__form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.recipe-form__section {
  padding: 26px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(109, 78, 40, 0.08);
  box-shadow: 0 20px 38px rgba(81, 58, 19, 0.06);
}

.recipe-form__section-head {
  margin-bottom: 18px;
}

.recipe-form__section-title {
  margin: 0 0 8px;
  color: #2f2112;
  font-size: 1.35rem;
  font-weight: 800;
}

.recipe-form__section-text,
.recipe-form__label {
  color: #6f5737;
}

.recipe-form__section-text {
  margin: 0;
  line-height: 1.6;
}

.recipe-form__grid {
  display: grid;
  gap: 14px;
}

.recipe-form__grid--two {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.recipe-form__grid--three {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.recipe-form__item-card {
  padding: 18px;
  border-radius: 20px;
  background: #fff8ea;
  border: 1px solid rgba(201, 167, 91, 0.18);
}

.recipe-form__item-card + .recipe-form__item-card {
  margin-top: 14px;
}

.recipe-form__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.recipe-form__item-title {
  margin: 0;
  color: #2f2112;
  font-size: 1.02rem;
  font-weight: 800;
}

.recipe-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-form__label {
  font-size: 0.92rem;
  font-weight: 700;
}

.recipe-form__textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 2px solid #ebdcc1;
  background: #fffdf9;
  color: #2f2112;
  font: inherit;
  resize: vertical;
}

.recipe-form__textarea:focus {
  outline: none;
  border-color: #ff9a53;
  box-shadow: 0 0 0 3px rgba(255, 154, 83, 0.14);
}

.recipe-form__months {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recipe-form__month {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid rgba(109, 78, 40, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #6f5737;
  font-weight: 700;
  cursor: pointer;
}

.recipe-form__month--active {
  color: #fff7ef;
  background: linear-gradient(135deg, #e46f2d 0%, #c2481b 100%);
  border-color: transparent;
}

.recipe-form__error {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 239, 240, 0.9);
  border: 1px solid rgba(225, 29, 72, 0.18);
  color: #a3123c;
  font-weight: 700;
}

.recipe-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
