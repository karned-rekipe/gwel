<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import {
  useCreateEquipment,
  useCreateTag,
  useCreateIngredient,
  useEquipment,
  useIngredientGroups,
  useIngredientRayons,
  useIngredients,
  useTags,
} from '@/composables/useCatalogQueries'
import { useRecipeFormatter, useRecipeValidation } from '@/composables/useRecipe'
import { useCreateRecipe, useSearchRecipes, useUpdateRecipe } from '@/composables/useRecipeQueries'
import { ingredientService } from '@/services/ingredientService'
import type {
  Equipment,
  Ingredient,
  Recipe,
  RecipeFormComponent,
  RecipeFormData,
  RecipeFormEquipment,
  RecipeFormIngredient,
  RecipeFormSource,
  RecipeFormStep,
  TagCategory,
} from '@/types/recipe'

const createEmptyIngredient = (): RecipeFormIngredient => ({
  ingredientUuid: '',
  search: '',
  quantity: '',
  unit: '',
})

const createEmptyEquipment = (): RecipeFormEquipment => ({
  equipmentUuid: '',
  search: '',
  quantity: '',
})

const createEmptyComponent = (): RecipeFormComponent => ({
  recipeUuid: '',
  search: '',
  label: '',
  servingsMultiplier: '',
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

type CatalogModalType = 'ingredient' | 'equipment'

const props = withDefaults(defineProps<{
  mode?: 'create' | 'edit'
  recipe?: Recipe | null
}>(), {
  mode: 'create',
  recipe: null,
})

const router = useRouter()
const { mutate: createRecipe, isPending, isError, error } = useCreateRecipe()
const { mutate: updateRecipe, isPending: isUpdatingRecipe, isError: isUpdateError, error: updateError } = useUpdateRecipe()
const { normalizeFormData } = useRecipeFormatter()

const ingredientSearchTerm = ref('')
const equipmentSearchTerm = ref('')
const componentSearchTerm = ref('')
const tagSearchTerm = ref('')
const { data: ingredientOptions, isFetching: isFetchingIngredients } = useIngredients(ingredientSearchTerm)
const { data: equipmentOptions, isFetching: isFetchingEquipment } = useEquipment(equipmentSearchTerm)
const { data: componentRecipeOptions, isFetching: isFetchingComponentRecipes } = useSearchRecipes(componentSearchTerm)
const { data: tagOptions } = useTags(tagSearchTerm)
const { data: groupOptions } = useIngredientGroups()
const { data: rayonOptions } = useIngredientRayons()
const { mutate: createIngredient, isPending: isCreatingIngredient, error: createIngredientError } = useCreateIngredient()
const { mutate: createEquipment, isPending: isCreatingEquipment, error: createEquipmentError } = useCreateEquipment()
const { mutate: createTag, isPending: isCreatingTag, error: createTagError } = useCreateTag()
const hasSubmitted = ref(false)
const duplicateIngredientCandidates = ref<Ingredient[]>([])
const isCheckingIngredientDuplicate = ref(false)

const formData = reactive<RecipeFormData>({
  name: '',
  description: '',
  servings: '4',
  originCountry: '',
  difficulty: '',
  price: '',
  favorite: false,
  tagUuids: [],
  mainImage: '',
  secondaryImages: '',
  ingredients: [createEmptyIngredient()],
  components: [createEmptyComponent()],
  equipment: [createEmptyEquipment()],
  steps: [createEmptyStep()],
  sources: [createEmptySource()],
})

const catalogModal = reactive({
  isOpen: false,
  type: 'ingredient' as CatalogModalType,
  index: -1,
  name: '',
  unit: '',
  rayonUuid: '',
  groupUuid: '',
  description: '',
})

const tagModal = reactive({
  isOpen: false,
  name: '',
  category: 'other' as TagCategory,
})

const { errors: validationErrors, firstInvalidFieldId, isFormValid } = useRecipeValidation(formData)

const catalogModalTitle = computed(() =>
  catalogModal.type === 'ingredient' ? 'Créer un ingrédient' : 'Créer un équipement',
)

const catalogCreateError = computed(() =>
  catalogModal.type === 'ingredient' ? createIngredientError.value : createEquipmentError.value,
)

const isCreatingCatalogItem = computed(() =>
  catalogModal.type === 'ingredient' ? isCreatingIngredient.value : isCreatingEquipment.value,
)

const submitError = computed(() => error.value?.message || updateError.value?.message || '')
const isSubmitPending = computed(() => isPending.value || isUpdatingRecipe.value)
const submitLabel = computed(() => {
  if (isSubmitPending.value) return props.mode === 'edit' ? 'Enregistrement…' : 'Création en cours…'
  return props.mode === 'edit' ? 'Enregistrer' : 'Créer la recette'
})
const validationSummary = computed(() => Object.values(validationErrors.value))

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

const addComponent = (): void => {
  formData.components.push(createEmptyComponent())
}

const removeComponent = (index: number): void => {
  if (formData.components.length > 1) {
    formData.components.splice(index, 1)
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

const handleIngredientSearch = (ingredient: RecipeFormIngredient, value: string): void => {
  ingredient.search = value
  ingredientSearchTerm.value = value
}

const handleEquipmentSearch = (equipment: RecipeFormEquipment, value: string): void => {
  equipment.search = value
  equipmentSearchTerm.value = value
}

const handleComponentSearch = (component: RecipeFormComponent, value: string): void => {
  component.search = value
  componentSearchTerm.value = value
}

const selectIngredient = (ingredient: RecipeFormIngredient): void => {
  const selected = ingredientOptions.value?.find((item) => item.uuid === ingredient.ingredientUuid)
  if (!selected) return
  ingredient.search = selected.name
  ingredient.unit = ingredient.unit || selected.unit || ''
}

const selectEquipment = (equipment: RecipeFormEquipment): void => {
  const selected = equipmentOptions.value?.find((item) => item.uuid === equipment.equipmentUuid)
  if (!selected) return
  equipment.search = selected.name
}

const selectComponent = (component: RecipeFormComponent): void => {
  const selected = componentRecipeOptions.value?.find((item) => item.uuid === component.recipeUuid)
  if (!selected) return
  component.search = selected.name
  component.label = component.label || selected.name
}

const openIngredientCreate = (index: number): void => {
  const ingredient = formData.ingredients[index]
  if (!ingredient) return
  catalogModal.isOpen = true
  catalogModal.type = 'ingredient'
  catalogModal.index = index
  catalogModal.name = ingredient.search
  catalogModal.unit = ingredient.unit
  catalogModal.rayonUuid = ''
  catalogModal.groupUuid = ''
  catalogModal.description = ''
}

const openEquipmentCreate = (index: number): void => {
  const equipment = formData.equipment[index]
  if (!equipment) return
  catalogModal.isOpen = true
  catalogModal.type = 'equipment'
  catalogModal.index = index
  catalogModal.name = equipment.search
  catalogModal.unit = ''
  catalogModal.rayonUuid = ''
  catalogModal.groupUuid = ''
  catalogModal.description = ''
}

const closeCatalogModal = (): void => {
  catalogModal.isOpen = false
  duplicateIngredientCandidates.value = []
}

const applyCreatedIngredient = (ingredient: Ingredient): void => {
  const line = formData.ingredients[catalogModal.index]
  if (!line) return
  line.ingredientUuid = ingredient.uuid
  line.search = ingredient.name
  line.unit = line.unit || ingredient.unit || catalogModal.unit
  ingredientSearchTerm.value = ingredient.name
  closeCatalogModal()
}

const applyCreatedEquipment = (equipment: Equipment): void => {
  const line = formData.equipment[catalogModal.index]
  if (!line) return
  line.equipmentUuid = equipment.uuid
  line.search = equipment.name
  equipmentSearchTerm.value = equipment.name
  closeCatalogModal()
}

const normalizeCatalogName = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^\p{L}\p{N}_]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const createCatalogIngredient = (name: string): void => {
  createIngredient(
    {
      name,
      unit: catalogModal.unit.trim() || null,
      rayon_uuid: catalogModal.rayonUuid || null,
      group_uuid: catalogModal.groupUuid || null,
      green_score: null,
      quantity: null,
      season_months: {},
    },
    { onSuccess: applyCreatedIngredient },
  )
}

const useExistingIngredient = (ingredient: Ingredient): void => {
  applyCreatedIngredient(ingredient)
}

const handleCreateCatalogItem = async (forceCreate = false): Promise<void> => {
  const name = catalogModal.name.trim()
  if (!name) return

  if (catalogModal.type === 'ingredient') {
    if (!forceCreate) {
      isCheckingIngredientDuplicate.value = true
      try {
        const normalizedName = normalizeCatalogName(name)
        const candidates = await ingredientService.getAll(name, 20)
        duplicateIngredientCandidates.value = candidates.filter(
          (ingredient) => normalizeCatalogName(ingredient.name) === normalizedName,
        )
        if (duplicateIngredientCandidates.value.length > 0) {
          return
        }
      } finally {
        isCheckingIngredientDuplicate.value = false
      }
    }
    createCatalogIngredient(name)
    return
  }

  createEquipment(
    {
      name,
      description: catalogModal.description.trim() || null,
    },
    { onSuccess: applyCreatedEquipment },
  )
}

const openTagCreate = (): void => {
  tagModal.name = tagSearchTerm.value
  tagModal.category = 'other'
  tagModal.isOpen = true
}

const closeTagModal = (): void => {
  tagModal.isOpen = false
}

const handleCreateTag = (): void => {
  const name = tagModal.name.trim()
  if (!name) return
  createTag(
    {
      name,
      category: tagModal.category,
      color: null,
    },
    {
      onSuccess: (tag) => {
        if (!formData.tagUuids.includes(tag.uuid)) {
          formData.tagUuids.push(tag.uuid)
        }
        tagSearchTerm.value = tag.name
        closeTagModal()
      },
    },
  )
}

const handleCancel = (): void => {
  if (props.mode === 'edit' && props.recipe) {
    router.push({ name: 'recipes-detail', params: { id: props.recipe.uuid } })
    return
  }
  router.push({ name: 'recipes-home' })
}

const handleSubmit = (): void => {
  hasSubmitted.value = true
  if (!isFormValid.value) {
    requestAnimationFrame(() => {
      const element = firstInvalidFieldId.value ? document.getElementById(firstInvalidFieldId.value) : null
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element?.focus({ preventScroll: true })
    })
    return
  }

  const payload = normalizeFormData(formData)
  if (props.mode === 'edit' && props.recipe) {
    updateRecipe({ uuid: props.recipe.uuid, data: payload }, {
      onSuccess: () => {
        router.push({ name: 'recipes-detail', params: { id: props.recipe?.uuid } })
      },
    })
    return
  }

  createRecipe(payload, {
    onSuccess: ({ uuid }) => {
      router.push({ name: 'recipes-detail', params: { id: uuid } })
    },
  })
}

const fillFromRecipe = (recipe: Recipe): void => {
  formData.name = recipe.name
  formData.description = recipe.description ?? ''
  formData.servings = String(recipe.servings ?? 4)
  formData.originCountry = recipe.origin_country ?? ''
  formData.difficulty = recipe.difficulty ? String(recipe.difficulty) : ''
  formData.price = recipe.price ? String(recipe.price) : ''
  formData.favorite = recipe.favorite
  formData.tagUuids = [...(recipe.tag_uuids ?? recipe.tags.map((tag) => tag.uuid))]
  formData.mainImage = recipe.main_image ?? ''
  formData.secondaryImages = recipe.secondary_images.join(', ')
  const manualIngredients = recipe.ingredients.filter(
    (ingredient) => ingredient.line_origin !== 'component_projection',
  )
  formData.ingredients = manualIngredients.length
    ? manualIngredients.map((ingredient) => ({
      ingredientUuid: ingredient.ingredient_uuid,
      search: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
    }))
    : [createEmptyIngredient()]
  formData.equipment = recipe.equipment.length
    ? recipe.equipment.map((equipment) => ({
      equipmentUuid: equipment.equipment_uuid,
      search: equipment.name,
      quantity: equipment.quantity ? String(equipment.quantity) : '',
    }))
    : [createEmptyEquipment()]
  formData.components = recipe.components.length
    ? recipe.components.map((component) => ({
      uuid: component.uuid,
      recipeUuid: component.recipe_uuid,
      search: component.recipe_name ?? component.label,
      label: component.label,
      servingsMultiplier: String(component.servings_multiplier),
    }))
    : [createEmptyComponent()]
  const manualSteps = recipe.steps.filter((step) => step.line_origin !== 'component_projection')
  formData.steps = manualSteps.length
    ? manualSteps.map((step) => ({
      name: step.name,
      description: step.description ?? '',
      preparationTime: step.preparation_time ? String(step.preparation_time) : '',
      cookingTime: step.cooking_time ? String(step.cooking_time) : '',
      restTime: step.rest_time ? String(step.rest_time) : '',
    }))
    : [createEmptyStep()]
  formData.sources = recipe.sources.length
    ? recipe.sources.map((source) => ({
      name: source.name,
      description: source.description ?? '',
      uri: source.uri ?? '',
    }))
    : [createEmptySource()]
}

watch(
  () => props.recipe,
  (recipe) => {
    if (recipe) fillFromRecipe(recipe)
  },
  { immediate: true },
)

watch(
  () => catalogModal.name,
  () => {
    duplicateIngredientCandidates.value = []
  },
)

const fieldError = (key: string): string => (hasSubmitted.value ? validationErrors.value[key] ?? '' : '')
</script>

<template>
  <section class="recipe-form">
    <form class="recipe-form__form" novalidate @submit.prevent="handleSubmit">
      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Informations générales</h2>
        </div>

        <div class="recipe-form__grid recipe-form__grid--two">
          <AppInput
            id="recipe-name"
            v-model="formData.name"
            label="Nom de la recette"
            placeholder="Ex. dhal de lentilles"
            required
            :error="fieldError('name')"
          />
          <AppInput
            id="recipe-servings"
            v-model="formData.servings"
            type="number"
            label="Portions"
            placeholder="4"
            required
            :error="fieldError('servings')"
          />
        </div>

        <div class="recipe-form__grid recipe-form__grid--four">
          <AppInput id="recipe-origin" v-model="formData.originCountry" label="Origine" placeholder="FR" />
          <AppInput id="recipe-difficulty" v-model="formData.difficulty" type="number" label="Difficulté" placeholder="1-5" />
          <AppInput id="recipe-price" v-model="formData.price" type="number" label="Prix" placeholder="1-5" />
          <label class="recipe-form__toggle">
            <input v-model="formData.favorite" type="checkbox" />
            <span>Favori</span>
          </label>
        </div>

        <div class="recipe-form__field">
          <label for="recipe-description" class="recipe-form__label">Description</label>
          <textarea
            id="recipe-description"
            v-model="formData.description"
            class="recipe-form__textarea"
            rows="4"
            placeholder="Notes, contexte ou intention culinaire."
          ></textarea>
        </div>

        <div class="recipe-form__field">
          <label for="recipe-tag-search" class="recipe-form__label">Tags</label>
          <div class="recipe-form__tag-tools">
            <input
              id="recipe-tag-search"
              v-model="tagSearchTerm"
              class="recipe-form__control"
              type="search"
              placeholder="Rechercher un tag"
            />
            <AppButton variant="secondary" @click="openTagCreate">Créer un tag</AppButton>
          </div>
          <select v-model="formData.tagUuids" class="recipe-form__control recipe-form__control--multi" multiple>
            <option v-for="tag in tagOptions ?? []" :key="tag.uuid" :value="tag.uuid">
              {{ tag.name }}
            </option>
          </select>
        </div>

        <div class="recipe-form__grid recipe-form__grid--two">
          <AppInput
            id="recipe-main-image"
            v-model="formData.mainImage"
            label="Image principale"
            placeholder="https://..."
          />
          <AppInput
            id="recipe-secondary-images"
            v-model="formData.secondaryImages"
            label="Images secondaires"
            placeholder="https://..., https://..."
          />
        </div>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head recipe-form__section-head--inline">
          <h2 class="recipe-form__section-title">Ingrédients</h2>
          <span v-if="isFetchingIngredients" class="recipe-form__hint">Recherche…</span>
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

          <div class="recipe-form__grid recipe-form__grid--four">
            <div class="recipe-form__field">
              <label :for="`ingredient-search-${index}`" class="recipe-form__label">Recherche</label>
              <input
                :id="`ingredient-search-${index}`"
                :value="ingredient.search"
                class="recipe-form__control"
                type="search"
                placeholder="Lentilles, tomate, farine..."
                @input="handleIngredientSearch(ingredient, ($event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="recipe-form__field">
              <label :for="`ingredient-select-${index}`" class="recipe-form__label">Ingrédient</label>
              <select
                :id="`ingredient-select-${index}`"
                v-model="ingredient.ingredientUuid"
                class="recipe-form__control"
                :class="{ 'recipe-form__control--error': !!fieldError(`ingredients.${index}.ingredientUuid`) }"
                :aria-invalid="!!fieldError(`ingredients.${index}.ingredientUuid`)"
                @change="selectIngredient(ingredient)"
              >
                <option value="">Choisir</option>
                <option
                  v-for="option in ingredientOptions ?? []"
                  :key="option.uuid"
                  :value="option.uuid"
                >
                  {{ option.name }}
                </option>
              </select>
              <span v-if="fieldError(`ingredients.${index}.ingredientUuid`)" class="recipe-form__field-error">
                {{ fieldError(`ingredients.${index}.ingredientUuid`) }}
              </span>
            </div>

            <AppInput
              :id="`ingredient-quantity-${index}`"
              v-model="ingredient.quantity"
              type="number"
              label="Quantité"
              placeholder="300"
              :error="fieldError(`ingredients.${index}.quantity`)"
            />
            <AppInput
              :id="`ingredient-unit-${index}`"
              v-model="ingredient.unit"
              label="Unité"
              placeholder="g"
              :error="fieldError(`ingredients.${index}.unit`)"
            />
          </div>

          <AppButton variant="secondary" @click="openIngredientCreate(index)">
            Créer cet ingrédient
          </AppButton>
        </div>

        <AppButton variant="secondary" @click="addIngredient">Ajouter un ingrédient</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head recipe-form__section-head--inline">
          <h2 class="recipe-form__section-title">Sous-recettes</h2>
          <span v-if="isFetchingComponentRecipes" class="recipe-form__hint">Recherche…</span>
        </div>

        <div
          v-for="(component, index) in formData.components"
          :key="component.uuid ?? `component-${index}`"
          class="recipe-form__item-card"
        >
          <div class="recipe-form__item-head">
            <h3 class="recipe-form__item-title">Sous-recette {{ index + 1 }}</h3>
            <AppButton
              v-if="formData.components.length > 1"
              variant="danger"
              @click="removeComponent(index)"
            >
              Retirer
            </AppButton>
          </div>

          <div class="recipe-form__grid recipe-form__grid--four">
            <div class="recipe-form__field">
              <label :for="`component-search-${index}`" class="recipe-form__label">Recherche</label>
              <input
                :id="`component-search-${index}`"
                :value="component.search"
                class="recipe-form__control"
                type="search"
                placeholder="Meringue, caramel, crème anglaise..."
                @input="handleComponentSearch(component, ($event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="recipe-form__field">
              <label :for="`component-select-${index}`" class="recipe-form__label">Recette</label>
              <select
                :id="`component-select-${index}`"
                v-model="component.recipeUuid"
                class="recipe-form__control"
                :class="{ 'recipe-form__control--error': !!fieldError(`components.${index}.recipeUuid`) }"
                :aria-invalid="!!fieldError(`components.${index}.recipeUuid`)"
                @change="selectComponent(component)"
              >
                <option value="">Choisir</option>
                <option
                  v-if="
                    component.recipeUuid &&
                    component.search &&
                    !(componentRecipeOptions ?? []).some((option) => option.uuid === component.recipeUuid)
                  "
                  :value="component.recipeUuid"
                >
                  {{ component.search }}
                </option>
                <option
                  v-for="option in componentRecipeOptions ?? []"
                  :key="option.uuid"
                  :value="option.uuid"
                  :disabled="props.recipe?.uuid === option.uuid"
                >
                  {{ option.name }}
                </option>
              </select>
              <span v-if="fieldError(`components.${index}.recipeUuid`)" class="recipe-form__field-error">
                {{ fieldError(`components.${index}.recipeUuid`) }}
              </span>
            </div>

            <AppInput
              :id="`component-label-${index}`"
              v-model="component.label"
              label="Libellé"
              placeholder="Crème anglaise"
              :error="fieldError(`components.${index}.label`)"
            />
            <AppInput
              :id="`component-multiplier-${index}`"
              v-model="component.servingsMultiplier"
              type="number"
              label="Multiplicateur"
              placeholder="1"
              :error="fieldError(`components.${index}.servingsMultiplier`)"
            />
          </div>
        </div>

        <AppButton variant="secondary" @click="addComponent">Ajouter une sous-recette</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head recipe-form__section-head--inline">
          <h2 class="recipe-form__section-title">Équipement</h2>
          <span v-if="isFetchingEquipment" class="recipe-form__hint">Recherche…</span>
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

          <div class="recipe-form__grid recipe-form__grid--three">
            <div class="recipe-form__field">
              <label :for="`equipment-search-${index}`" class="recipe-form__label">Recherche</label>
              <input
                :id="`equipment-search-${index}`"
                :value="equipment.search"
                class="recipe-form__control"
                type="search"
                placeholder="Four, cocotte, mixeur..."
                @input="handleEquipmentSearch(equipment, ($event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="recipe-form__field">
              <label :for="`equipment-select-${index}`" class="recipe-form__label">Équipement</label>
              <select
                :id="`equipment-select-${index}`"
                v-model="equipment.equipmentUuid"
                class="recipe-form__control"
                :class="{ 'recipe-form__control--error': !!fieldError(`equipment.${index}.equipmentUuid`) }"
                :aria-invalid="!!fieldError(`equipment.${index}.equipmentUuid`)"
                @change="selectEquipment(equipment)"
              >
                <option value="">Aucun</option>
                <option
                  v-for="option in equipmentOptions ?? []"
                  :key="option.uuid"
                  :value="option.uuid"
                >
                  {{ option.name }}
                </option>
              </select>
              <span v-if="fieldError(`equipment.${index}.equipmentUuid`)" class="recipe-form__field-error">
                {{ fieldError(`equipment.${index}.equipmentUuid`) }}
              </span>
            </div>

            <AppInput
              :id="`equipment-quantity-${index}`"
              v-model="equipment.quantity"
              type="number"
              label="Quantité"
              placeholder="1"
              :error="fieldError(`equipment.${index}.quantity`)"
            />
          </div>

          <AppButton variant="secondary" @click="openEquipmentCreate(index)">
            Créer cet équipement
          </AppButton>
        </div>

        <AppButton variant="secondary" @click="addEquipment">Ajouter un équipement</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Étapes</h2>
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
            :error="fieldError(`steps.${index}.name`)"
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
              label="Préparation"
              placeholder="15"
            />
            <AppInput
              :id="`step-cooking-${index}`"
              v-model="step.cookingTime"
              type="number"
              label="Cuisson"
              placeholder="25"
            />
            <AppInput
              :id="`step-rest-${index}`"
              v-model="step.restTime"
              type="number"
              label="Repos"
              placeholder="60"
            />
          </div>
        </div>

        <AppButton variant="secondary" @click="addStep">Ajouter une étape</AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Sources</h2>
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

      <div v-if="hasSubmitted && validationSummary.length" class="recipe-form__error" role="alert">
        <strong>La recette n’est pas encore enregistrée.</strong>
        <ul>
          <li v-for="message in validationSummary" :key="message">{{ message }}</li>
        </ul>
      </div>

      <div v-if="isError || isUpdateError" class="recipe-form__error" role="alert">
        {{ submitError || 'La sauvegarde de la recette a échoué.' }}
      </div>

      <div class="recipe-form__actions">
        <AppButton type="button" variant="secondary" :disabled="isSubmitPending" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="isSubmitPending">
          {{ submitLabel }}
        </AppButton>
      </div>
    </form>

    <div v-if="catalogModal.isOpen" class="recipe-form__modal-backdrop" @click.self="closeCatalogModal">
      <section class="recipe-form__modal" role="dialog" aria-modal="true" :aria-label="catalogModalTitle">
        <header class="recipe-form__modal-head">
          <h2 class="recipe-form__modal-title">{{ catalogModalTitle }}</h2>
          <button type="button" class="recipe-form__modal-close" @click="closeCatalogModal">×</button>
        </header>

        <AppInput
          id="catalog-name"
          v-model="catalogModal.name"
          label="Nom"
          placeholder="Nom"
          required
        />

        <template v-if="catalogModal.type === 'ingredient'">
          <div class="recipe-form__grid recipe-form__grid--three">
            <AppInput id="catalog-unit" v-model="catalogModal.unit" label="Unité" placeholder="g" />
            <div class="recipe-form__field">
              <label for="catalog-group" class="recipe-form__label">Groupe</label>
              <select id="catalog-group" v-model="catalogModal.groupUuid" class="recipe-form__control">
                <option value="">Aucun</option>
                <option v-for="group in groupOptions ?? []" :key="group.uuid" :value="group.uuid">
                  {{ group.name }}
                </option>
              </select>
            </div>
            <div class="recipe-form__field">
              <label for="catalog-rayon" class="recipe-form__label">Rayon</label>
              <select id="catalog-rayon" v-model="catalogModal.rayonUuid" class="recipe-form__control">
                <option value="">Aucun</option>
                <option v-for="rayon in rayonOptions ?? []" :key="rayon.uuid" :value="rayon.uuid">
                  {{ rayon.name }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="duplicateIngredientCandidates.length" class="recipe-form__duplicate-warning">
            <p>Un ingrédient proche existe déjà.</p>
            <button
              v-for="candidate in duplicateIngredientCandidates"
              :key="candidate.uuid"
              type="button"
              class="recipe-form__duplicate-choice"
              @click="useExistingIngredient(candidate)"
            >
              Utiliser {{ candidate.name }}
            </button>
            <AppButton variant="secondary" :disabled="isCreatingCatalogItem" @click="handleCreateCatalogItem(true)">
              Créer quand même
            </AppButton>
          </div>
        </template>

        <div v-else class="recipe-form__field">
          <label for="catalog-description" class="recipe-form__label">Description</label>
          <textarea
            id="catalog-description"
            v-model="catalogModal.description"
            class="recipe-form__textarea"
            rows="3"
            placeholder="Détail optionnel."
          ></textarea>
        </div>

        <p v-if="catalogCreateError" class="recipe-form__modal-error">
          {{ catalogCreateError.message }}
        </p>

        <div class="recipe-form__modal-actions">
          <AppButton variant="secondary" :disabled="isCreatingCatalogItem" @click="closeCatalogModal">
            Annuler
          </AppButton>
          <AppButton
            variant="primary"
            :disabled="!catalogModal.name.trim() || isCreatingCatalogItem || isCheckingIngredientDuplicate"
            @click="handleCreateCatalogItem()"
          >
            {{ isCreatingCatalogItem || isCheckingIngredientDuplicate ? 'Création…' : 'Créer' }}
          </AppButton>
        </div>
      </section>
    </div>

    <div v-if="tagModal.isOpen" class="recipe-form__modal-backdrop" @click.self="closeTagModal">
      <section class="recipe-form__modal" role="dialog" aria-modal="true" aria-label="Créer un tag">
        <header class="recipe-form__modal-head">
          <h2 class="recipe-form__modal-title">Créer un tag</h2>
          <button type="button" class="recipe-form__modal-close" @click="closeTagModal">×</button>
        </header>
        <AppInput id="tag-name" v-model="tagModal.name" label="Nom" placeholder="Végan" required />
        <div class="recipe-form__field">
          <label for="tag-category" class="recipe-form__label">Catégorie</label>
          <select id="tag-category" v-model="tagModal.category" class="recipe-form__control">
            <option value="diet">Alimentation</option>
            <option value="occasion">Occasion</option>
            <option value="service">Service</option>
            <option value="technique">Technique</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <p v-if="createTagError" class="recipe-form__modal-error">{{ createTagError.message }}</p>
        <div class="recipe-form__modal-actions">
          <AppButton variant="secondary" :disabled="isCreatingTag" @click="closeTagModal">Annuler</AppButton>
          <AppButton variant="primary" :disabled="!tagModal.name.trim() || isCreatingTag" @click="handleCreateTag">
            {{ isCreatingTag ? 'Création…' : 'Créer' }}
          </AppButton>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.recipe-form {
  max-width: 1040px;
}

.recipe-form__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-form__section {
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.recipe-form__section-head {
  margin-bottom: 16px;
}

.recipe-form__section-head--inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recipe-form__section-title,
.recipe-form__item-title,
.recipe-form__modal-title {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 650;
}

.recipe-form__section-title {
  font-size: 1.18rem;
}

.recipe-form__item-title {
  font-size: 1rem;
}

.recipe-form__grid {
  display: grid;
  gap: 12px;
}

.recipe-form__grid--two {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.recipe-form__grid--three {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.recipe-form__grid--four {
  grid-template-columns: minmax(210px, 1.2fr) minmax(210px, 1.2fr) minmax(110px, 0.6fr) minmax(110px, 0.6fr);
}

.recipe-form__item-card {
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}

.recipe-form__item-card + .recipe-form__item-card,
.recipe-form__field + .recipe-form__field,
.recipe-form__grid + .recipe-form__field,
.recipe-form__field + .recipe-form__grid,
.recipe-form__grid + .recipe-form__grid {
  margin-top: 12px;
}

.recipe-form__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.recipe-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-form__label,
.recipe-form__hint {
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.recipe-form__control,
.recipe-form__textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  outline: none;
}

.recipe-form__control {
  min-height: 44px;
  padding: 10px 12px;
}

.recipe-form__control--multi {
  min-height: 120px;
}

.recipe-form__textarea {
  min-height: 110px;
  padding: 12px 14px;
  resize: vertical;
}

.recipe-form__toggle {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-weight: 600;
}

.recipe-form__tag-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.recipe-form__control:focus,
.recipe-form__textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}

.recipe-form__control--error {
  border-color: var(--color-danger);
}

.recipe-form__field-error {
  margin-top: -4px;
  color: var(--color-danger);
  font-size: 0.875rem;
}

.recipe-form__error,
.recipe-form__modal-error {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: rgba(215, 0, 21, 0.08);
  border: 1px solid rgba(215, 0, 21, 0.16);
  color: var(--color-danger);
  font-weight: 600;
}

.recipe-form__error ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.recipe-form__duplicate-warning {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(0, 113, 227, 0.16);
  border-radius: var(--radius-md);
  background: rgba(0, 113, 227, 0.06);
}

.recipe-form__duplicate-warning p {
  flex-basis: 100%;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
}

.recipe-form__duplicate-choice {
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 650;
}

.recipe-form__actions,
.recipe-form__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.recipe-form__modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(10px);
}

.recipe-form__modal {
  width: min(620px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
}

.recipe-form__modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recipe-form__modal-close {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 1.2rem;
}

@media (max-width: 900px) {
  .recipe-form__grid--four {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
</style>
