<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import RecipeAIProcessingOverlay from '@/components/organisms/RecipeAIProcessingOverlay.vue'
import { useRecipeAIProgress } from '@/composables/useRecipeAIProgress'
import { useCreateRecipeWithAI } from '@/composables/useRecipeQueries'
import { aiRecipeService } from '@/services/aiRecipeService'
import type { AICreateResponse, RecipeAIInput, RecipeCreationSourceKind } from '@/types/recipe'

const router = useRouter()
type SourceMode = RecipeCreationSourceKind
const allowedDocumentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const rawText = ref('')
const sourceMode = ref<SourceMode>('text')
const sourceOptions: Array<{ value: SourceMode; icon: string; label: string; description: string }> = [
  { value: 'text', icon: '✍️', label: 'Texte', description: 'Coller toute la recette' },
  { value: 'link', icon: '🔗', label: 'Lien', description: 'Page Web, image ou PDF' },
  { value: 'document', icon: '📄', label: 'Document', description: 'Importer une image ou un PDF' },
]
const sourceUrl = ref('')
const documentBase64 = ref('')
const documentMediaType = ref('')
const selectedFileName = ref('')
const fileError = ref('')
const duplicateCandidate = ref<AICreateResponse | null>(null)
const noActionMessage = ref('')
const activeTrackingId = ref('')
let resultTimer: number | null = null

const { mutate: createRecipeWithAI, isPending, isError, error } = useCreateRecipeWithAI()
const {
  isVisible: showProcessingOverlay,
  stage: processingStage,
  completedStages: completedProcessingStages,
  start: startProcessing,
  complete: completeProcessing,
  fail: failProcessing,
  stop: stopProcessing,
} = useRecipeAIProgress(() => (
  activeTrackingId.value
    ? aiRecipeService.getRunningRecipeCreation(activeTrackingId.value)
    : Promise.resolve(null)
))

const isFormValid = computed(() => {
  switch (sourceMode.value) {
    case 'text':
      return rawText.value.trim().length >= 10
    case 'link':
      return /^https?:\/\//i.test(sourceUrl.value.trim())
    case 'document':
      return Boolean(documentBase64.value && documentMediaType.value && !fileError.value)
  }
})
const duplicateRecipeLabel = computed(
  () =>
    duplicateCandidate.value?.existing_recipe_name ||
    duplicateCandidate.value?.recipe_name ||
    'Cette recette',
)

const sourceSubject = computed(() => {
  if (sourceMode.value === 'link') return sourceUrl.value.trim() || 'Lien de recette'
  if (sourceMode.value === 'document') return selectedFileName.value || 'Document de recette'
  return 'Nouvelle recette depuis un texte'
})

watch([rawText, sourceUrl, sourceMode], () => {
  duplicateCandidate.value = null
  noActionMessage.value = ''
})

const selectedInput = (): RecipeAIInput => {
  switch (sourceMode.value) {
    case 'text':
      return { kind: 'text', rawText: rawText.value }
    case 'link':
      return { kind: 'link', url: sourceUrl.value }
    case 'document':
      return {
        kind: 'document',
        base64: documentBase64.value,
        mediaType: documentMediaType.value,
        fileName: selectedFileName.value,
      }
  }
}

const setSourceMode = (mode: SourceMode): void => {
  sourceMode.value = mode
}

const handleFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  documentBase64.value = ''
  documentMediaType.value = ''
  selectedFileName.value = ''
  fileError.value = ''
  duplicateCandidate.value = null
  noActionMessage.value = ''
  if (!file) return
  if (!allowedDocumentTypes.has(file.type)) {
    fileError.value = 'Utilise un PDF ou une image JPEG, PNG, WebP ou GIF.'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    fileError.value = 'Le document ne doit pas dépasser 10 Mo.'
    return
  }
  const reader = new FileReader()
  reader.onerror = () => {
    fileError.value = 'Lecture du document impossible.'
  }
  reader.onload = () => {
    const result = String(reader.result || '')
    documentBase64.value = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result
    documentMediaType.value = file.type
    selectedFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

const handleCancel = (): void => {
  router.push({ name: 'recipes-home' })
}

const createTrackingId = (): string =>
  `recipe-create-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const handleCreateResult = (result: AICreateResponse): void => {
  if (result.duplicate_confirmation_required) {
    stopProcessing()
    duplicateCandidate.value = result
    noActionMessage.value = ''
    return
  }

  completeProcessing()
  resultTimer = window.setTimeout(() => {
    resultTimer = null
    router.push({ name: 'recipes-detail', params: { id: result.recipe_uuid } })
  }, 700)
}

const launchCreation = (allowDuplicate: boolean): void => {
  activeTrackingId.value = createTrackingId()
  startProcessing('reading_source')
  createRecipeWithAI({
    input: selectedInput(),
    allowDuplicate,
    trackingId: activeTrackingId.value,
  }, {
    onSuccess: handleCreateResult,
    onError: failProcessing,
  })
}

const handleSubmit = (): void => {
  if (!isFormValid.value) {
    return
  }

  duplicateCandidate.value = null
  noActionMessage.value = ''

  launchCreation(false)
}

const handleConfirmDuplicate = (): void => {
  if (!isFormValid.value || !duplicateCandidate.value) {
    return
  }

  launchCreation(true)
}

const handleRejectDuplicate = (): void => {
  duplicateCandidate.value = null
  noActionMessage.value = 'Aucune recette créée.'
}

onBeforeUnmount(() => {
  if (resultTimer !== null) window.clearTimeout(resultTimer)
})
</script>

<template>
  <RecipeAIProcessingOverlay
    v-if="showProcessingOverlay"
    :stage="processingStage"
    :completed-stages="completedProcessingStages"
    mode="create"
    :source-kind="sourceMode"
    :subject="sourceSubject"
  />

  <section class="recipe-form-ai">
    <header class="recipe-form-ai__header">
      <h2 class="recipe-form-ai__title">Ajout assisté par IA</h2>
      <p class="recipe-form-ai__subtitle">
        Choisis une source : texte complet, lien public ou document. L’assistant extrait le contenu,
        structure les ingrédients et les étapes, complète les métadonnées puis crée l’image principale.
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
          <span class="recipe-form-ai__source-icon" aria-hidden="true">{{ option.icon }}</span>
          <span>
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </button>
      </div>

      <div v-if="sourceMode === 'text'" class="recipe-form-ai__field">
        <label for="raw-text" class="recipe-form-ai__label">Coller toute la recette</label>
        <textarea
          id="raw-text"
          v-model="rawText"
          class="recipe-form-ai__textarea"
          rows="16"
          placeholder="Colle ici le titre, les ingrédients, les quantités et toutes les étapes."
          :disabled="isPending"
        ></textarea>
      </div>

      <p
        v-if="sourceMode === 'text'"
        class="recipe-form-ai__hint"
        :class="{ 'recipe-form-ai__hint--error': rawText.length > 0 && rawText.length < 10 }"
      >
        Le texte sera analysé directement par le traitement linguistique · {{ rawText.length }} caractères saisis
      </p>

      <div v-else-if="sourceMode === 'link'" class="recipe-form-ai__field">
        <label for="source-url" class="recipe-form-ai__label">Lien vers une recette</label>
        <input id="source-url" v-model="sourceUrl" class="recipe-form-ai__input" type="url" placeholder="https://…" :disabled="isPending" />
        <p class="recipe-form-ai__hint">
          Une page Web sera parcourue automatiquement ; une image ou un PDF public passera par l’OCR.
        </p>
      </div>

      <div v-else class="recipe-form-ai__field">
        <label for="recipe-document" class="recipe-form-ai__label">PDF ou image de la recette</label>
        <input
          id="recipe-document"
          class="recipe-form-ai__file"
          type="file"
          accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif"
          :disabled="isPending"
          @change="handleFileChange"
        />
        <p v-if="selectedFileName" class="recipe-form-ai__hint">{{ selectedFileName }}</p>
        <p v-else class="recipe-form-ai__hint">PDF, JPEG, PNG, WebP ou GIF · 10 Mo maximum.</p>
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
          {{ isPending ? 'Traitement en cours…' : 'Créer avec l’IA' }}
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.recipe-form-ai__source-tab {
  min-width: 0;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color var(--transition-base), background var(--transition-base);
}

.recipe-form-ai__source-tab--active {
  border-color: var(--color-primary);
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}

.recipe-form-ai__source-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.recipe-form-ai__source-icon {
  flex: 0 0 auto;
  font-size: 1.55rem;
}

.recipe-form-ai__source-tab strong,
.recipe-form-ai__source-tab small {
  display: block;
}

.recipe-form-ai__source-tab strong {
  color: var(--color-text-primary);
  font-size: 0.94rem;
}

.recipe-form-ai__source-tab small {
  margin-top: 3px;
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  line-height: 1.25;
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
  .recipe-form-ai__source-tabs {
    grid-template-columns: 1fr;
  }

  .recipe-form-ai__duplicate {
    grid-template-columns: 1fr;
  }

  .recipe-form-ai__duplicate-actions {
    justify-content: stretch;
  }
}
</style>
