<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import AppInput from '@/components/atoms/AppInput.vue'
import EquipmentCard from '@/components/equipment/EquipmentCard.vue'
import IngredientCard from '@/components/ingredients/IngredientCard.vue'
import RecipePicker from '@/components/planning/RecipePicker.vue'
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
  Tag,
  TagCategory,
} from '@/types/recipe'
import { countryFlagFrom, countryOptions } from '@/utils/countryFlags'

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
  unitCount: '',
  originCountry: '',
  difficulty: '',
  price: '',
  favorite: false,
  tagUuids: [],
  mainImage: '',
  secondaryImages: '',
  ingredients: [],
  components: [createEmptyComponent()],
  equipment: [],
  steps: [createEmptyStep()],
  sources: [createEmptySource()],
})

const ingredientDraft = reactive<RecipeFormIngredient>(createEmptyIngredient())
const equipmentDraft = reactive<RecipeFormEquipment>(createEmptyEquipment())
const ingredientDraftError = ref('')
const equipmentDraftError = ref('')
const editingIngredientIndex = ref<number | null>(null)
const editingEquipmentIndex = ref<number | null>(null)
const ingredientEditDraft = reactive<RecipeFormIngredient>(createEmptyIngredient())
const equipmentEditDraft = reactive<RecipeFormEquipment>(createEmptyEquipment())
const ingredientEditError = ref('')
const equipmentEditError = ref('')

const catalogModal = reactive({
  isOpen: false,
  type: 'ingredient' as CatalogModalType,
  index: -1,
  target: 'ingredient-add' as 'ingredient-add' | 'ingredient-edit' | 'equipment-add' | 'equipment-edit',
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
const activeTagUuid = ref<string | null>(null)
const knownTags = ref(new Map<string, Tag>())
const isComponentModalOpen = ref(false)
const editingStepIndex = ref<number | null>(null)
const stepEditDraft = reactive<RecipeFormStep>(createEmptyStep())

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
const partsPerPerson = computed(() => {
  const servings = numericValue(formData.servings)
  const unitCount = numericValue(formData.unitCount)
  if (!servings || !unitCount) return '—'
  const value = unitCount / servings
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',')
})
const selectedTags = computed(() => (
  formData.tagUuids
    .map((uuid) => knownTags.value.get(uuid))
    .filter((tag): tag is Tag => Boolean(tag))
))
const suggestedTags = computed(() => (
  (tagOptions.value ?? []).filter((tag) => !formData.tagUuids.includes(tag.uuid)).slice(0, 6)
))
const ingredientModalTitle = computed(() =>
  editingIngredientIndex.value === -1 ? 'Ajouter un ingrédient' : 'Modifier un ingrédient',
)
const equipmentModalTitle = computed(() =>
  editingEquipmentIndex.value === -1 ? 'Ajouter un équipement' : 'Modifier un équipement',
)
const selectedIngredientForEdit = computed(() => (
  ingredientOptions.value?.find((ingredient) => ingredient.uuid === ingredientEditDraft.ingredientUuid) ?? null
))
const selectedIngredientUnits = computed(() => {
  const selected = selectedIngredientForEdit.value
  const units = new Set<string>()
  if (selected?.unit) units.add(selected.unit)
  selected?.unit_profile.allowed_units.forEach((unit) => units.add(unit))
  if (ingredientEditDraft.unit) units.add(ingredientEditDraft.unit)
  return [...units]
})

const resetIngredientDraft = (): void => {
  Object.assign(ingredientDraft, createEmptyIngredient())
  ingredientDraftError.value = ''
}

const resetEquipmentDraft = (): void => {
  Object.assign(equipmentDraft, createEmptyEquipment())
  equipmentDraftError.value = ''
}

const numericValue = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : null
}

const ingredientLineError = (index: number): string => [
  fieldError(`ingredients.${index}.ingredientUuid`),
  fieldError(`ingredients.${index}.quantity`),
  fieldError(`ingredients.${index}.unit`),
].filter(Boolean).join(' ')

const equipmentLineError = (index: number): string => [
  fieldError(`equipment.${index}.equipmentUuid`),
  fieldError(`equipment.${index}.quantity`),
].filter(Boolean).join(' ')

const validateIngredientLine = (ingredient: RecipeFormIngredient): string => {
  if (!ingredient.ingredientUuid) return 'Choisis un ingrédient.'
  const quantity = numericValue(ingredient.quantity)
  if (quantity === null || quantity <= 0) return 'La quantité est obligatoire.'
  if (!ingredient.unit.trim()) return 'L’unité est obligatoire.'
  return ''
}

const validateEquipmentLine = (equipment: RecipeFormEquipment): string => {
  if (!equipment.equipmentUuid) return 'Choisis un équipement.'
  const quantity = numericValue(equipment.quantity)
  if (equipment.quantity.trim() && (quantity === null || quantity < 0)) return 'La quantité doit être positive.'
  return ''
}

const addIngredient = (): void => {
  const message = validateIngredientLine(ingredientDraft)
  if (message) {
    ingredientDraftError.value = message
    return
  }
  formData.ingredients.push({ ...ingredientDraft })
  resetIngredientDraft()
}

const removeIngredient = (index: number): void => {
  formData.ingredients.splice(index, 1)
  if (editingIngredientIndex.value === index) closeIngredientEdit()
}

const openIngredientAdd = (): void => {
  editingIngredientIndex.value = -1
  Object.assign(ingredientEditDraft, createEmptyIngredient())
  ingredientEditError.value = ''
  ingredientSearchTerm.value = ''
}

const addEquipment = (): void => {
  const message = validateEquipmentLine(equipmentDraft)
  if (message) {
    equipmentDraftError.value = message
    return
  }
  formData.equipment.push({ ...equipmentDraft })
  resetEquipmentDraft()
}

const removeEquipment = (index: number): void => {
  formData.equipment.splice(index, 1)
  if (editingEquipmentIndex.value === index) closeEquipmentEdit()
}

const openEquipmentAdd = (): void => {
  editingEquipmentIndex.value = -1
  Object.assign(equipmentEditDraft, createEmptyEquipment())
  equipmentEditError.value = ''
  equipmentSearchTerm.value = ''
}

const addComponent = (): void => {
  isComponentModalOpen.value = true
}

const removeComponent = (index: number): void => {
  formData.components.splice(index, 1)
}

const addStep = (): void => {
  editingStepIndex.value = -1
  Object.assign(stepEditDraft, createEmptyStep())
}

const removeStep = (index: number): void => {
  if (formData.steps.length > 1) {
    formData.steps.splice(index, 1)
  }
}

const openStepEdit = (index: number): void => {
  const step = formData.steps[index]
  if (!step) return
  editingStepIndex.value = index
  Object.assign(stepEditDraft, step)
}

const closeStepEdit = (): void => {
  editingStepIndex.value = null
  Object.assign(stepEditDraft, createEmptyStep())
}

const saveStepEdit = (): void => {
  if (editingStepIndex.value === null) return
  const step = { ...stepEditDraft }
  if (editingStepIndex.value === -1) {
    formData.steps.push(step)
  } else {
    formData.steps[editingStepIndex.value] = step
  }
  closeStepEdit()
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
  ingredientDraftError.value = ''
  ingredientEditError.value = ''
}

const handleEquipmentSearch = (equipment: RecipeFormEquipment, value: string): void => {
  equipment.search = value
  equipmentSearchTerm.value = value
  equipmentDraftError.value = ''
  equipmentEditError.value = ''
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
  ingredientDraftError.value = ''
  ingredientEditError.value = ''
}

const selectIngredientCard = (target: RecipeFormIngredient, ingredient: Ingredient): void => {
  target.ingredientUuid = ingredient.uuid
  target.search = ingredient.name
  target.unit = target.unit || ingredient.unit || ingredient.unit_profile.default_recipe_unit || ingredient.unit_profile.reference_unit || ''
  ingredientSearchTerm.value = ingredient.name
  ingredientDraftError.value = ''
  ingredientEditError.value = ''
}

const selectEquipment = (equipment: RecipeFormEquipment): void => {
  const selected = equipmentOptions.value?.find((item) => item.uuid === equipment.equipmentUuid)
  if (!selected) return
  equipment.search = selected.name
  equipmentDraftError.value = ''
  equipmentEditError.value = ''
}

const selectEquipmentCard = (target: RecipeFormEquipment, equipment: Equipment): void => {
  target.equipmentUuid = equipment.uuid
  target.search = equipment.name
  equipmentSearchTerm.value = equipment.name
  equipmentDraftError.value = ''
  equipmentEditError.value = ''
}

const openIngredientEdit = (index: number): void => {
  const ingredient = formData.ingredients[index]
  if (!ingredient) return
  editingIngredientIndex.value = index
  Object.assign(ingredientEditDraft, ingredient)
  ingredientEditError.value = ''
  ingredientSearchTerm.value = ingredient.search
}

const closeIngredientEdit = (): void => {
  editingIngredientIndex.value = null
  ingredientEditError.value = ''
  Object.assign(ingredientEditDraft, createEmptyIngredient())
}

const saveIngredientEdit = (): void => {
  if (editingIngredientIndex.value === null) return
  const message = validateIngredientLine(ingredientEditDraft)
  if (message) {
    ingredientEditError.value = message
    return
  }
  if (editingIngredientIndex.value === -1) {
    formData.ingredients.push({ ...ingredientEditDraft })
  } else {
    formData.ingredients[editingIngredientIndex.value] = { ...ingredientEditDraft }
  }
  closeIngredientEdit()
}

const openEquipmentEdit = (index: number): void => {
  const equipment = formData.equipment[index]
  if (!equipment) return
  editingEquipmentIndex.value = index
  Object.assign(equipmentEditDraft, equipment)
  equipmentEditError.value = ''
  equipmentSearchTerm.value = equipment.search
}

const closeEquipmentEdit = (): void => {
  editingEquipmentIndex.value = null
  equipmentEditError.value = ''
  Object.assign(equipmentEditDraft, createEmptyEquipment())
}

const saveEquipmentEdit = (): void => {
  if (editingEquipmentIndex.value === null) return
  const message = validateEquipmentLine(equipmentEditDraft)
  if (message) {
    equipmentEditError.value = message
    return
  }
  if (editingEquipmentIndex.value === -1) {
    formData.equipment.push({ ...equipmentEditDraft })
  } else {
    formData.equipment[editingEquipmentIndex.value] = { ...equipmentEditDraft }
  }
  closeEquipmentEdit()
}

const selectComponent = (component: RecipeFormComponent): void => {
  const selected = componentRecipeOptions.value?.find((item) => item.uuid === component.recipeUuid)
  if (!selected) return
  component.search = selected.name
  component.label = component.label || selected.name
}

const addComponentRecipe = (recipe: Recipe): void => {
  if (props.recipe?.uuid === recipe.uuid) return
  formData.components.push({
    recipeUuid: recipe.uuid,
    search: recipe.name,
    label: recipe.name,
    servingsMultiplier: '1',
  })
  isComponentModalOpen.value = false
}

const openIngredientCreate = (index: number): void => {
  const ingredient = index === -1 ? ingredientDraft : index === -2 ? ingredientEditDraft : formData.ingredients[index]
  if (!ingredient) return
  catalogModal.isOpen = true
  catalogModal.type = 'ingredient'
  catalogModal.index = index
  catalogModal.target = index === -2 ? 'ingredient-edit' : 'ingredient-add'
  catalogModal.name = ingredient.search
  catalogModal.unit = ingredient.unit
  catalogModal.rayonUuid = ''
  catalogModal.groupUuid = ''
  catalogModal.description = ''
}

const openEquipmentCreate = (index: number): void => {
  const equipment = index === -1 ? equipmentDraft : index === -2 ? equipmentEditDraft : formData.equipment[index]
  if (!equipment) return
  catalogModal.isOpen = true
  catalogModal.type = 'equipment'
  catalogModal.index = index
  catalogModal.target = index === -2 ? 'equipment-edit' : 'equipment-add'
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
  const line = catalogModal.target === 'ingredient-edit'
    ? ingredientEditDraft
    : catalogModal.index === -1
      ? ingredientDraft
      : formData.ingredients[catalogModal.index]
  if (!line) return
  line.ingredientUuid = ingredient.uuid
  line.search = ingredient.name
  line.unit = line.unit || ingredient.unit || catalogModal.unit
  ingredientSearchTerm.value = ingredient.name
  closeCatalogModal()
}

const applyCreatedEquipment = (equipment: Equipment): void => {
  const line = catalogModal.target === 'equipment-edit'
    ? equipmentEditDraft
    : catalogModal.index === -1
      ? equipmentDraft
      : formData.equipment[catalogModal.index]
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

const addExistingTag = (tag: Tag): void => {
  knownTags.value.set(tag.uuid, tag)
  if (!formData.tagUuids.includes(tag.uuid)) {
    formData.tagUuids.push(tag.uuid)
  }
  tagSearchTerm.value = ''
}

const removeTag = (uuid: string): void => {
  formData.tagUuids = formData.tagUuids.filter((tagUuid) => tagUuid !== uuid)
  if (activeTagUuid.value === uuid) activeTagUuid.value = null
}

const createOrSelectTag = (name: string): void => {
  const normalized = name.trim().toLocaleLowerCase('fr-FR')
  if (!normalized) return
  const existing = (tagOptions.value ?? []).find((tag) => tag.name.toLocaleLowerCase('fr-FR') === normalized)
  if (existing) {
    addExistingTag(existing)
    return
  }
  createTag(
    {
      name: name.trim(),
      category: 'other',
      color: null,
    },
    {
      onSuccess: (tag) => {
        addExistingTag(tag)
      },
    },
  )
}

const handleTagInputKeydown = (event: KeyboardEvent): void => {
  if (!['Enter', 'Tab', ' '].includes(event.key)) return
  const value = tagSearchTerm.value.trim()
  if (!value) return
  event.preventDefault()
  createOrSelectTag(value)
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
  formData.unitCount = recipe.unit_count ? String(recipe.unit_count) : ''
  formData.originCountry = recipe.origin_country ?? ''
  formData.difficulty = recipe.difficulty ? String(recipe.difficulty) : ''
  formData.price = recipe.price ? String(recipe.price) : ''
  formData.favorite = recipe.favorite
  formData.tagUuids = [...(recipe.tag_uuids ?? recipe.tags.map((tag) => tag.uuid))]
  knownTags.value = new Map(recipe.tags.map((tag) => [tag.uuid, tag]))
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
    : []
  formData.equipment = recipe.equipment.length
    ? recipe.equipment.map((equipment) => ({
      equipmentUuid: equipment.equipment_uuid,
      search: equipment.name,
      quantity: equipment.quantity ? String(equipment.quantity) : '',
    }))
    : []
  formData.components = recipe.components.length
    ? recipe.components.map((component) => ({
      uuid: component.uuid,
      recipeUuid: component.recipe_uuid,
      search: component.recipe_name ?? component.label,
      label: component.label,
      servingsMultiplier: String(component.servings_multiplier),
    }))
    : []
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

const formatDuration = (value: string): string => {
  const minutes = numericValue(value)
  if (!minutes || minutes <= 0) return '—'
  if (minutes < 60) return `${Math.trunc(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remaining = Math.trunc(minutes % 60)
  return remaining ? `${hours} h ${remaining}` : `${hours} h`
}

const stepTimeItems = (step: RecipeFormStep) => [
  { key: 'preparation', icon: '🍴', value: formatDuration(step.preparationTime) },
  { key: 'cooking', icon: '💧', value: formatDuration(step.cookingTime) },
  { key: 'rest', icon: '◔', value: formatDuration(step.restTime) },
]

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

watch(
  tagOptions,
  (tags) => {
    const next = new Map(knownTags.value)
    for (const tag of tags ?? []) {
      next.set(tag.uuid, tag)
    }
    knownTags.value = next
  },
  { immediate: true },
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

        <div class="recipe-form__grid recipe-form__grid--three">
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
            label="Nb de personnes"
            placeholder="4"
            required
            :error="fieldError('servings')"
          />
          <AppInput
            id="recipe-unit-count"
            v-model="formData.unitCount"
            type="number"
            label="Nombre de parts"
            placeholder="12"
            :error="fieldError('unitCount')"
          />
          <div class="recipe-form__computed">
            <span>Parts / personne</span>
            <strong>{{ partsPerPerson }}</strong>
          </div>
        </div>

        <div class="recipe-form__grid recipe-form__grid--four">
          <label class="recipe-form__field">
            <span class="recipe-form__label">Origine</span>
            <select id="recipe-origin" v-model="formData.originCountry" class="recipe-form__control">
              <option value="">⚑ Non renseignée</option>
              <option v-for="country in countryOptions" :key="country.code" :value="country.code">
                {{ countryFlagFrom(country.code) }} {{ country.name }}
              </option>
            </select>
          </label>
          <label class="recipe-form__field">
            <span class="recipe-form__label">Difficulté</span>
            <select id="recipe-difficulty" v-model="formData.difficulty" class="recipe-form__control">
              <option value="">👨‍🍳 Non renseignée</option>
              <option v-for="level in 5" :key="level" :value="String(level)">👨‍🍳 {{ level }}/5</option>
            </select>
          </label>
          <label class="recipe-form__field">
            <span class="recipe-form__label">Prix</span>
            <select id="recipe-price" v-model="formData.price" class="recipe-form__control">
              <option value="">€ Non renseigné</option>
              <option v-for="level in 5" :key="level" :value="String(level)">{{ '€'.repeat(level) }}</option>
            </select>
          </label>
          <label class="recipe-form__field">
            <span class="recipe-form__label">Favori</span>
            <select v-model="formData.favorite" class="recipe-form__control">
              <option :value="true">★ Oui</option>
              <option :value="false">☆ Non</option>
            </select>
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
          <div class="recipe-form__tag-editor">
            <button
              v-for="tag in selectedTags"
              :key="tag.uuid"
              type="button"
              class="recipe-form__tag-badge"
              :class="{ 'recipe-form__tag-badge--active': activeTagUuid === tag.uuid }"
              @click="activeTagUuid = activeTagUuid === tag.uuid ? null : tag.uuid"
            >
              #{{ tag.name }}
              <span
                v-if="activeTagUuid === tag.uuid"
                role="button"
                tabindex="0"
                aria-label="Supprimer ce tag"
                @click.stop="removeTag(tag.uuid)"
                @keydown.enter.stop.prevent="removeTag(tag.uuid)"
                @keydown.space.stop.prevent="removeTag(tag.uuid)"
              >
                🗑
              </span>
            </button>
            <textarea
              id="recipe-tag-search"
              v-model="tagSearchTerm"
              class="recipe-form__tag-input"
              rows="2"
              placeholder="Taper un tag puis espace, entrée ou tabulation"
              @keydown="handleTagInputKeydown"
            ></textarea>
          </div>
          <div v-if="suggestedTags.length" class="recipe-form__tag-suggestions" aria-label="Suggestions de tags">
            <button
              v-for="tag in suggestedTags"
              :key="tag.uuid"
              type="button"
              @click="addExistingTag(tag)"
            >
              #{{ tag.name }}
            </button>
          </div>
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

        <ul v-if="formData.ingredients.length" class="recipe-form__line-list">
          <li
            v-for="(ingredient, index) in formData.ingredients"
            :id="`ingredient-row-${index}`"
            :key="`ingredient-${index}`"
            class="recipe-form__line"
            :class="{ 'recipe-form__line--error': !!ingredientLineError(index) }"
          >
            <button type="button" class="recipe-form__line-main" @click="openIngredientEdit(index)">
              <span class="recipe-form__line-qty">{{ ingredient.quantity }}</span>
              <span class="recipe-form__line-unit">{{ ingredient.unit }}</span>
              <strong>{{ ingredient.search || 'Ingrédient à préciser' }}</strong>
            </button>
            <button type="button" class="recipe-form__line-remove" aria-label="Retirer cet ingrédient" @click="removeIngredient(index)">
              ×
            </button>
            <p v-if="ingredientLineError(index)" class="recipe-form__line-error">{{ ingredientLineError(index) }}</p>
          </li>
        </ul>
        <p v-else class="recipe-form__empty-list">Aucun ingrédient renseigné.</p>

        <AppButton variant="secondary" @click="openIngredientAdd">
          <span aria-hidden="true">＋</span>
          Ajouter un ingrédient
        </AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head recipe-form__section-head--inline">
          <h2 class="recipe-form__section-title">Sous-recettes</h2>
          <span v-if="isFetchingComponentRecipes" class="recipe-form__hint">Recherche…</span>
        </div>

        <ul v-if="formData.components.length" class="recipe-form__line-list">
          <li
            v-for="(component, index) in formData.components"
            :key="component.uuid ?? `component-${index}`"
            class="recipe-form__line"
          >
            <div class="recipe-form__line-main recipe-form__line-main--static">
              <span class="recipe-form__line-qty">x{{ component.servingsMultiplier || '1' }}</span>
              <span class="recipe-form__line-unit">recette</span>
              <strong>{{ component.label || component.search || 'Sous-recette' }}</strong>
            </div>
            <button type="button" class="recipe-form__line-remove" aria-label="Retirer cette sous-recette" @click="removeComponent(index)">
              ×
            </button>
          </li>
        </ul>
        <p v-else class="recipe-form__empty-list">Aucune sous-recette.</p>

        <AppButton variant="secondary" @click="addComponent">
          <span aria-hidden="true">＋</span>
          Ajouter une sous-recette
        </AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head recipe-form__section-head--inline">
          <h2 class="recipe-form__section-title">Équipement</h2>
          <span v-if="isFetchingEquipment" class="recipe-form__hint">Recherche…</span>
        </div>

        <ul v-if="formData.equipment.length" class="recipe-form__line-list">
          <li
            v-for="(equipment, index) in formData.equipment"
            :id="`equipment-row-${index}`"
            :key="`equipment-${index}`"
            class="recipe-form__line"
            :class="{ 'recipe-form__line--error': !!equipmentLineError(index) }"
          >
            <button type="button" class="recipe-form__line-main" @click="openEquipmentEdit(index)">
              <span class="recipe-form__line-qty">{{ equipment.quantity || '1' }}</span>
              <span class="recipe-form__line-unit">x</span>
              <strong>{{ equipment.search || 'Équipement à préciser' }}</strong>
            </button>
            <button type="button" class="recipe-form__line-remove" aria-label="Retirer cet équipement" @click="removeEquipment(index)">
              ×
            </button>
            <p v-if="equipmentLineError(index)" class="recipe-form__line-error">{{ equipmentLineError(index) }}</p>
          </li>
        </ul>
        <p v-else class="recipe-form__empty-list">Aucun équipement renseigné.</p>

        <AppButton variant="secondary" @click="openEquipmentAdd">
          <span aria-hidden="true">＋</span>
          Ajouter un équipement
        </AppButton>
      </section>

      <section class="recipe-form__section">
        <div class="recipe-form__section-head">
          <h2 class="recipe-form__section-title">Étapes</h2>
        </div>

        <ol class="recipe-form__steps">
          <li v-for="(step, index) in formData.steps" :key="`step-${index}`">
            <span class="recipe-form__step-index">{{ index + 1 }}</span>
            <div class="recipe-form__step-body">
              <header class="recipe-form__step-head">
                <h3>{{ step.name || 'Étape à préciser' }}</h3>
                <div class="recipe-form__step-times" aria-label="Temps de l'étape">
                  <span v-for="time in stepTimeItems(step)" :key="time.key" :title="time.key">
                    <span aria-hidden="true">{{ time.icon }}</span>
                    {{ time.value }}
                  </span>
                </div>
              </header>
              <p v-if="step.description">{{ step.description }}</p>
              <div class="recipe-form__step-actions">
                <AppButton variant="secondary" @click="openStepEdit(index)">Modifier</AppButton>
                <AppButton v-if="formData.steps.length > 1" variant="danger" @click="removeStep(index)">Retirer</AppButton>
              </div>
            </div>
          </li>
        </ol>

        <AppButton variant="secondary" @click="addStep">
          <span aria-hidden="true">＋</span>
          Ajouter une étape
        </AppButton>
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

    <div v-if="catalogModal.isOpen" class="recipe-form__modal-backdrop recipe-form__modal-backdrop--catalog" @click.self="closeCatalogModal">
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

    <div v-if="editingIngredientIndex !== null" class="recipe-form__modal-backdrop" @click.self="closeIngredientEdit">
      <section class="recipe-form__modal recipe-form__modal--wide" role="dialog" aria-modal="true" :aria-label="ingredientModalTitle">
        <header class="recipe-form__modal-head">
          <h2 class="recipe-form__modal-title">{{ ingredientModalTitle }}</h2>
          <button type="button" class="recipe-form__modal-close" @click="closeIngredientEdit">×</button>
        </header>

        <div class="recipe-form__field">
          <label for="ingredient-edit-search" class="recipe-form__label">Recherche</label>
          <input
            id="ingredient-edit-search"
            :value="ingredientEditDraft.search"
            class="recipe-form__control"
            type="search"
            placeholder="Lentilles, tomate, farine..."
            @input="handleIngredientSearch(ingredientEditDraft, ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div v-if="ingredientOptions?.length" class="recipe-form__picker-grid">
          <IngredientCard
            v-for="option in ingredientOptions"
            :key="option.uuid"
            :name="option.name"
            :image-url="option.media_profile.main_image_uri"
            :class="{ 'recipe-form__picker-card--selected': ingredientEditDraft.ingredientUuid === option.uuid }"
            @click="selectIngredientCard(ingredientEditDraft, option)"
          />
        </div>
        <p v-else-if="ingredientEditDraft.search && !isFetchingIngredients" class="recipe-form__empty-list">
          Aucun ingrédient trouvé.
        </p>

        <div class="recipe-form__grid recipe-form__grid--two">
          <AppInput
            id="ingredient-edit-quantity"
            v-model="ingredientEditDraft.quantity"
            type="number"
            label="Quantité"
            placeholder="300"
          />
          <label class="recipe-form__field">
            <span class="recipe-form__label">Unité</span>
            <select v-if="selectedIngredientUnits.length" v-model="ingredientEditDraft.unit" class="recipe-form__control">
              <option value="">Choisir</option>
              <option v-for="unit in selectedIngredientUnits" :key="unit" :value="unit">{{ unit }}</option>
            </select>
            <input v-else v-model="ingredientEditDraft.unit" class="recipe-form__control" type="text" placeholder="g" />
          </label>
        </div>

        <p v-if="ingredientEditError" class="recipe-form__modal-error">{{ ingredientEditError }}</p>

        <div class="recipe-form__modal-actions">
          <AppButton
            v-if="ingredientEditDraft.search && !ingredientOptions?.length"
            variant="secondary"
            @click="openIngredientCreate(-2)"
          >
            Créer cet ingrédient
          </AppButton>
          <AppButton variant="secondary" @click="closeIngredientEdit">Annuler</AppButton>
          <AppButton variant="primary" @click="saveIngredientEdit">Appliquer</AppButton>
        </div>
      </section>
    </div>

    <div v-if="editingEquipmentIndex !== null" class="recipe-form__modal-backdrop" @click.self="closeEquipmentEdit">
      <section class="recipe-form__modal recipe-form__modal--wide" role="dialog" aria-modal="true" :aria-label="equipmentModalTitle">
        <header class="recipe-form__modal-head">
          <h2 class="recipe-form__modal-title">{{ equipmentModalTitle }}</h2>
          <button type="button" class="recipe-form__modal-close" @click="closeEquipmentEdit">×</button>
        </header>

        <div class="recipe-form__field">
          <label for="equipment-edit-search" class="recipe-form__label">Recherche</label>
          <input
            id="equipment-edit-search"
            :value="equipmentEditDraft.search"
            class="recipe-form__control"
            type="search"
            placeholder="Four, cocotte, mixeur..."
            @input="handleEquipmentSearch(equipmentEditDraft, ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div v-if="equipmentOptions?.length" class="recipe-form__picker-grid">
          <EquipmentCard
            v-for="option in equipmentOptions"
            :key="option.uuid"
            :name="option.name"
            :class="{ 'recipe-form__picker-card--selected': equipmentEditDraft.equipmentUuid === option.uuid }"
            @click="selectEquipmentCard(equipmentEditDraft, option)"
          />
        </div>
        <p v-else-if="equipmentEditDraft.search && !isFetchingEquipment" class="recipe-form__empty-list">
          Aucun équipement trouvé.
        </p>

        <AppInput
          id="equipment-edit-quantity"
          v-model="equipmentEditDraft.quantity"
          type="number"
          label="Quantité"
          placeholder="1"
        />

        <p v-if="equipmentEditError" class="recipe-form__modal-error">{{ equipmentEditError }}</p>

        <div class="recipe-form__modal-actions">
          <AppButton
            v-if="equipmentEditDraft.search && !equipmentOptions?.length"
            variant="secondary"
            @click="openEquipmentCreate(-2)"
          >
            Créer cet équipement
          </AppButton>
          <AppButton variant="secondary" @click="closeEquipmentEdit">Annuler</AppButton>
          <AppButton variant="primary" @click="saveEquipmentEdit">Appliquer</AppButton>
        </div>
      </section>
    </div>

    <div v-if="isComponentModalOpen" class="recipe-form__modal-backdrop" @click.self="isComponentModalOpen = false">
      <section class="recipe-form__modal recipe-form__modal--wide" role="dialog" aria-modal="true" aria-label="Ajouter une sous-recette">
        <header class="recipe-form__modal-head">
          <h2 class="recipe-form__modal-title">Ajouter une sous-recette</h2>
          <button type="button" class="recipe-form__modal-close" @click="isComponentModalOpen = false">×</button>
        </header>
        <RecipePicker button-label="Sélectionner" @select="addComponentRecipe" />
      </section>
    </div>

    <div v-if="editingStepIndex !== null" class="recipe-form__modal-backdrop" @click.self="closeStepEdit">
      <section class="recipe-form__modal" role="dialog" aria-modal="true" aria-label="Modifier une étape">
        <header class="recipe-form__modal-head">
          <h2 class="recipe-form__modal-title">{{ editingStepIndex === -1 ? 'Ajouter une étape' : 'Modifier une étape' }}</h2>
          <button type="button" class="recipe-form__modal-close" @click="closeStepEdit">×</button>
        </header>

        <AppInput
          id="step-modal-name"
          v-model="stepEditDraft.name"
          label="Titre"
          placeholder="Préparer les légumes"
        />
        <div class="recipe-form__field">
          <label for="step-modal-description" class="recipe-form__label">Description</label>
          <textarea
            id="step-modal-description"
            v-model="stepEditDraft.description"
            class="recipe-form__textarea"
            rows="4"
            placeholder="Décris précisément cette étape."
          ></textarea>
        </div>
        <div class="recipe-form__grid recipe-form__grid--three">
          <AppInput id="step-modal-preparation" v-model="stepEditDraft.preparationTime" type="number" label="Préparation" placeholder="15" />
          <AppInput id="step-modal-cooking" v-model="stepEditDraft.cookingTime" type="number" label="Cuisson" placeholder="25" />
          <AppInput id="step-modal-rest" v-model="stepEditDraft.restTime" type="number" label="Repos" placeholder="60" />
        </div>
        <div class="recipe-form__modal-actions">
          <AppButton variant="secondary" @click="closeStepEdit">Annuler</AppButton>
          <AppButton variant="primary" @click="saveStepEdit">Appliquer</AppButton>
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

.recipe-form__computed {
  min-height: 44px;
  display: grid;
  gap: 5px;
  align-content: end;
  padding: 0 0 2px;
}

.recipe-form__computed span {
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.recipe-form__computed strong {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}

.recipe-form__item-card {
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}

.recipe-form__add-card {
  display: grid;
  gap: 12px;
  margin-top: 14px;
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

.recipe-form__line-list {
  overflow: hidden;
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.recipe-form__line {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.recipe-form__line:last-child {
  border-bottom: 0;
}

.recipe-form__line--error {
  background: rgba(215, 0, 21, 0.04);
}

.recipe-form__line-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 72px 58px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 11px 0 11px 0;
  text-align: left;
}

.recipe-form__line-main--static {
  cursor: default;
}

.recipe-form__line-main--static:hover strong {
  color: var(--color-text-primary);
}

.recipe-form__line-main:hover strong,
.recipe-form__line-main:focus-visible strong {
  color: var(--color-primary);
}

.recipe-form__line-main:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: -2px;
}

.recipe-form__line-qty {
  text-align: right;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.recipe-form__line-unit {
  color: var(--color-text-secondary);
}

.recipe-form__line-main strong {
  overflow: hidden;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-form__line-remove {
  width: 36px;
  height: 36px;
  margin-right: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-danger);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.recipe-form__line-error {
  grid-column: 1 / -1;
  margin: -4px 10px 10px 140px;
  color: var(--color-danger);
  font-size: 0.85rem;
  font-weight: 650;
}

.recipe-form__empty-list {
  margin: 0;
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.recipe-form__inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
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

.recipe-form__tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: start;
  min-height: 92px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.recipe-form__tag-badge,
.recipe-form__tag-suggestions button {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 5px 10px;
}

.recipe-form__tag-badge--active {
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border));
}

.recipe-form__tag-badge span {
  color: var(--color-danger);
  line-height: 1;
}

.recipe-form__tag-input {
  min-width: min(360px, 100%);
  flex: 1 1 260px;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  resize: none;
  outline: none;
  padding: 5px 2px;
}

.recipe-form__tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
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

.recipe-form__picker-grid {
  max-height: min(420px, 46vh);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding: 2px 4px 4px 2px;
}

.recipe-form__picker-grid :deep(.ingredient-card),
.recipe-form__picker-grid :deep(.equipment-card) {
  min-height: 176px;
}

.recipe-form__picker-card--selected {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.recipe-form__steps {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}

.recipe-form__steps li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.recipe-form__steps li:last-child {
  border-bottom: 0;
}

.recipe-form__step-index {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-secondary);
  font-size: 0.85rem;
  font-weight: 700;
}

.recipe-form__step-body {
  min-width: 0;
}

.recipe-form__step-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.recipe-form__step-head h3 {
  margin: 0;
  font-size: 1rem;
}

.recipe-form__step-body p {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.recipe-form__step-times {
  display: grid;
  grid-template-columns: repeat(3, 76px);
  gap: 6px;
  justify-content: end;
}

.recipe-form__step-times span {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
  padding: 4px 6px;
  white-space: nowrap;
}

.recipe-form__step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
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

.recipe-form__modal-backdrop--catalog {
  z-index: 320;
}

.recipe-form__modal {
  width: min(620px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
}

.recipe-form__modal--wide {
  width: min(980px, 100%);
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

  .recipe-form__line-main {
    grid-template-columns: 54px 44px minmax(0, 1fr);
  }

  .recipe-form__line-error {
    margin-left: 108px;
  }

  .recipe-form__step-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .recipe-form__step-times {
    grid-template-columns: repeat(3, minmax(68px, 1fr));
    justify-content: stretch;
  }
}

@media (max-width: 620px) {
  .recipe-form__line {
    grid-template-columns: minmax(0, 1fr);
    padding-right: 0;
  }

  .recipe-form__line-main {
    grid-template-columns: 52px 42px minmax(0, 1fr);
    padding-right: 44px;
  }

  .recipe-form__line-remove {
    position: absolute;
    justify-self: end;
    margin-top: 4px;
  }

  .recipe-form__line-error {
    margin-left: 10px;
  }
}
</style>
