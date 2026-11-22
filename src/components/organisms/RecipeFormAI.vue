<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import { useCreateRecipeWithAI } from '@/composables/useRecipeQueries'
import type { AICreateResponse, RecipeAIInput } from '@/types/recipe'

const router = useRouter()
type SourceMode = 'text' | 'url' | 'image-upload' | 'image-url'
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const rawText = ref('')
const sourceMode = ref<SourceMode>('text')
const sourceOptions: Array<{ value: SourceMode; label: string }> = [
  { value: 'text', label: 'Texte' },
  { value: 'url', label: 'Lien recette' },
  { value: 'image-upload', label: 'Image' },
  { value: 'image-url', label: 'Lien image' },
]
const sourceUrl = ref('')
const imageUrl = ref('')
const imageBase64 = ref('')
const imageMediaType = ref('')
const selectedFileName = ref('')
const fileError = ref('')
const duplicateCandidate = ref<AICreateResponse | null>(null)
const noActionMessage = ref('')

const { mutate: createRecipeWithAI, isPending, isError, error } = useCreateRecipeWithAI()

const isFormValid = computed(() => {
  switch (sourceMode.value) {
    case 'text':
      return rawText.value.trim().length >= 10
    case 'url':
      return /^https?:\/\//i.test(sourceUrl.value.trim())
    case 'image-url':
      return /^https?:\/\//i.test(imageUrl.value.trim())
    case 'image-upload':
      return Boolean(imageBase64.value && imageMediaType.value && !fileError.value)
  }
})
const duplicateRecipeLabel = computed(
  () =>
    duplicateCandidate.value?.existing_recipe_name ||
    duplicateCandidate.value?.recipe_name ||
    'Cette recette',
)

watch([rawText, sourceUrl, imageUrl, sourceMode], () => {
  duplicateCandidate.value = null
  noActionMessage.value = ''
})

const selectedInput = (): RecipeAIInput => {
  switch (sourceMode.value) {
    case 'text':
      return { kind: 'text', rawText: rawText.value }
    case 'url':
      return { kind: 'url', url: sourceUrl.value }
    case 'image-url':
      return { kind: 'image-url', url: imageUrl.value }
    case 'image-upload':
      return { kind: 'image-upload', base64: imageBase64.value, mediaType: imageMediaType.value }
  }
}

const setSourceMode = (mode: SourceMode): void => {
  sourceMode.value = mode
}

const handleFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  imageBase64.value = ''
  imageMediaType.value = ''
  selectedFileName.value = ''
  fileError.value = ''
  duplicateCandidate.value = null
  noActionMessage.value = ''
  if (!file) return
  if (!allowedImageTypes.has(file.type)) {
    fileError.value = 'Utilise une image JPEG, PNG, WebP ou GIF.'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    fileError.value = 'L’image ne doit pas dépasser 10 Mo.'
    return
  }
  const reader = new FileReader()
  reader.onerror = () => {
    fileError.value = 'Lecture de l’image impossible.'
  }
  reader.onload = () => {
    const result = String(reader.result || '')
    imageBase64.value = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result
    imageMediaType.value = file.type
    selectedFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

const handleCancel = (): void => {
  router.push({ name: 'recipes-home' })
}

const handleCreateResult = (result: AICreateResponse): void => {
  if (result.duplicate_confirmation_required) {
    duplicateCandidate.value = result
    noActionMessage.value = ''
    return
  }

  router.push({ name: 'recipes-detail', params: { id: result.recipe_uuid } })
}

const handleSubmit = (): void => {
  if (!isFormValid.value) {
    return
  }

  duplicateCandidate.value = null
  noActionMessage.value = ''

  createRecipeWithAI({
    input: selectedInput(),
    allowDuplicate: false,
  }, {
    onSuccess: handleCreateResult,
  })
}

const handleConfirmDuplicate = (): void => {
  if (!isFormValid.value || !duplicateCandidate.value) {
    return
  }

  createRecipeWithAI({
    input: selectedInput(),
    allowDuplicate: true,
  }, {
    onSuccess: handleCreateResult,
  })
}

const handleRejectDuplicate = (): void => {
  duplicateCandidate.value = null
  noActionMessage.value = 'Aucune recette créée.'
}
</script>

<template>
  <section class="recipe-form-ai">
    <header class="recipe-form-ai__header">
      <h2 class="recipe-form-ai__title">Ajout assisté par IA</h2>
      <p class="recipe-form-ai__subtitle">
        Colle une recette, fournis l’URL d’une fiche Web ou charge une image. L’agent complète les
        métadonnées, reclasse ingrédients et étapes, puis génère l’image principale.
      </p>
    </header>

    <form class="recipe-form-ai__form" @submit.prevent="handleSubmit">
      <div class="recipe-form-ai__source-tabs" role="tablist" aria-label="Source de la recette">
        <button
          v-for="option in sourceOptions"
          :key="option.value"
          type="button"
          class="recipe-form-ai__source-tab"
          :class="{ 'recipe-form-ai__source-tab--active': sourceMode === option.value }"
          role="tab"
          :aria-selected="sourceMode === option.value"
          @click="setSourceMode(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="sourceMode === 'text'" class="recipe-form-ai__field">
        <label for="raw-text" class="recipe-form-ai__label">Texte brut</label>
        <textarea
          id="raw-text"
          v-model="rawText"
          class="recipe-form-ai__textarea"
          rows="16"
          placeholder="Colle ici une recette en texte libre."
          :disabled="isPending"
        ></textarea>
      </div>

      <p
        v-if="sourceMode === 'text'"
        class="recipe-form-ai__hint"
        :class="{ 'recipe-form-ai__hint--error': rawText.length > 0 && rawText.length < 10 }"
      >
        {{ rawText.length }} caractères saisis
      </p>

      <div v-else-if="sourceMode === 'url'" class="recipe-form-ai__field">
        <label for="source-url" class="recipe-form-ai__label">Lien vers la fiche recette</label>
        <input id="source-url" v-model="sourceUrl" class="recipe-form-ai__input" type="url" placeholder="https://…" :disabled="isPending" />
        <p class="recipe-form-ai__hint">Seules les pages publiques HTTP(S) sont acceptées.</p>
      </div>

      <div v-else-if="sourceMode === 'image-url'" class="recipe-form-ai__field">
        <label for="image-url" class="recipe-form-ai__label">Lien vers l’image</label>
        <input id="image-url" v-model="imageUrl" class="recipe-form-ai__input" type="url" placeholder="https://…/recette.jpg" :disabled="isPending" />
        <p class="recipe-form-ai__hint">L’OCR accepte les images JPEG, PNG, WebP ou GIF publiques.</p>
      </div>

      <div v-else class="recipe-form-ai__field">
        <label for="image-file" class="recipe-form-ai__label">Image de la recette</label>
        <input id="image-file" class="recipe-form-ai__file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" :disabled="isPending" @change="handleFileChange" />
        <p v-if="selectedFileName" class="recipe-form-ai__hint">{{ selectedFileName }}</p>
        <p v-if="fileError" class="recipe-form-ai__hint recipe-form-ai__hint--error">{{ fileError }}</p>
      </div>

      <div v-if="isError" class="recipe-form-ai__error" role="alert">
        {{ error?.message || 'Le traitement IA a échoué.' }}
      </div>

      <div v-if="noActionMessage" class="recipe-form-ai__notice" role="status">
        {{ noActionMessage }}
      </div>

      <div
        v-if="duplicateCandidate"
        class="recipe-form-ai__duplicate"
        role="region"
        aria-labelledby="duplicate-title"
      >
        <div>
          <h3 id="duplicate-title" class="recipe-form-ai__duplicate-title">
            Recette déjà existante
          </h3>
          <p class="recipe-form-ai__duplicate-text">
            {{ duplicateRecipeLabel }} existe déjà. Créer un doublon avec cette recette
            structurée ?
          </p>
        </div>
        <div class="recipe-form-ai__duplicate-actions">
          <AppButton
            type="button"
            variant="secondary"
            :disabled="isPending"
            @click="handleRejectDuplicate"
          >
            Ne rien faire
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            :disabled="isPending"
            @click="handleConfirmDuplicate"
          >
            {{ isPending ? 'Création en cours…' : 'Créer le doublon' }}
          </AppButton>
        </div>
      </div>

      <div class="recipe-form-ai__actions">
        <AppButton type="button" variant="secondary" :disabled="isPending" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton
          type="submit"
          variant="primary"
          :disabled="!isFormValid || isPending || duplicateCandidate !== null"
        >
          {{ isPending ? 'Traitement en cours…' : 'Structurer avec IA' }}
        </AppButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.recipe-form-ai {
  max-width: 960px;
  padding: 22px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.recipe-form-ai__header {
  margin-bottom: 18px;
}

.recipe-form-ai__title {
  margin: 0 0 10px;
  color: var(--color-text-primary);
  font-size: 1.5rem;
  font-weight: 650;
}

.recipe-form-ai__subtitle,
.recipe-form-ai__hint {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.recipe-form-ai__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.recipe-form-ai__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-form-ai__source-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recipe-form-ai__source-tab {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-weight: 650;
}

.recipe-form-ai__source-tab--active {
  border-color: var(--color-primary);
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}

.recipe-form-ai__label {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
  font-weight: 600;
}

.recipe-form-ai__textarea,
.recipe-form-ai__input,
.recipe-form-ai__file {
  width: 100%;
  min-height: 320px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  resize: vertical;
}

.recipe-form-ai__input,
.recipe-form-ai__file {
  min-height: 48px;
}

.recipe-form-ai__textarea:focus,
.recipe-form-ai__input:focus,
.recipe-form-ai__file:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
}

.recipe-form-ai__hint--error {
  color: var(--color-danger);
  font-weight: 600;
}

.recipe-form-ai__error {
  padding: 16px 18px;
  border-radius: var(--radius-md);
  background: rgba(215, 0, 21, 0.08);
  border: 1px solid rgba(215, 0, 21, 0.16);
  color: var(--color-danger);
  font-weight: 600;
}

.recipe-form-ai__notice {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.22);
  color: var(--color-text-primary);
  font-weight: 600;
}

.recipe-form-ai__duplicate {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 149, 0, 0.32);
  background: rgba(255, 149, 0, 0.09);
}

.recipe-form-ai__duplicate-title {
  margin: 0 0 6px;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 700;
}

.recipe-form-ai__duplicate-text {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.recipe-form-ai__duplicate-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.recipe-form-ai__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 720px) {
  .recipe-form-ai__duplicate {
    grid-template-columns: 1fr;
  }

  .recipe-form-ai__duplicate-actions {
    justify-content: stretch;
  }
}
</style>
