<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCreateRecipeWithAI } from '@/composables/useRecipeQueries'
import AppButton from '@/components/atoms/AppButton.vue'

const router = useRouter()

// Vue Query - Mutation pour créer une recette avec IA
const { mutate: createRecipeWithAI, isPending, isError, error } = useCreateRecipeWithAI()

// État du formulaire
const rawText = ref('')

// Validation du formulaire
const isFormValid = computed(() => {
  return rawText.value.trim().length >= 10
})

// Annulation
const handleCancel = (): void => {
  router.push({ name: 'home' })
}

// Soumission du formulaire avec Vue Query
const handleSubmit = (): void => {
  if (!isFormValid.value) {
    return
  }

  createRecipeWithAI(rawText.value, {
    onSuccess: () => {
      // Redirection après succès
      router.push({ name: 'home' })
    }
  })
}
</script>

<template>
  <div class="recipe-form-ai">
    <header class="recipe-form-ai__header">
      <h1 class="recipe-form-ai__title">Nouvelle Recette avec IA</h1>
      <p class="recipe-form-ai__subtitle">
        Collez ou saisissez votre recette en texte libre. Notre IA va la structurer pour vous.
      </p>
    </header>

    <form class="recipe-form-ai__form" @submit.prevent="handleSubmit">
      <div class="recipe-form-ai__field">
        <label for="raw-text" class="recipe-form-ai__label">
          Texte de la recette
          <span class="recipe-form-ai__required" aria-label="Champ requis">*</span>
        </label>
        <p class="recipe-form-ai__help">
          Exemple : "Tarte Tatin : 6 pommes, 150g de beurre, 200g de sucre. Éplucher les pommes..."
        </p>
        <textarea
          id="raw-text"
          v-model="rawText"
          class="recipe-form-ai__textarea"
          placeholder="Collez ou saisissez votre recette ici (copier/coller d'internet, OCR, saisie libre...)"
          rows="15"
          required
          :disabled="isPending"
          aria-describedby="raw-text-help"
        ></textarea>
        <p id="raw-text-help" class="recipe-form-ai__character-count" :class="{ 'recipe-form-ai__character-count--error': rawText.length > 0 && rawText.length < 10 }">
          {{ rawText.length }} caractères (minimum 10 requis)
        </p>
      </div>

      <!-- Affichage des erreurs de mutation -->
      <div v-if="isError" class="recipe-form-ai__error" role="alert">
        <p class="recipe-form-ai__error-message">
          ❌ {{ error?.message || 'Erreur lors de la création de la recette avec l\'IA' }}
        </p>
      </div>

      <!-- Actions -->
      <div class="recipe-form-ai__actions">
        <AppButton type="button" variant="secondary" :disabled="isPending" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="!isFormValid || isPending">
          {{ isPending ? 'Création en cours...' : 'Créer avec IA' }}
        </AppButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Container */
.recipe-form-ai {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background-color: var(--color-background, #ffffff);
}

/* Header */
.recipe-form-ai__header {
  margin-bottom: 32px;
  text-align: center;
}

.recipe-form-ai__title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary, #2c3e50);
  margin: 0 0 8px 0;
}

.recipe-form-ai__subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary, #718096);
  margin: 0;
  line-height: 1.5;
}

/* Form */
.recipe-form-ai__form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Field */
.recipe-form-ai__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-form-ai__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary, #2c3e50);
}

.recipe-form-ai__required {
  color: var(--color-danger, #dc3545);
  margin-left: 4px;
}

.recipe-form-ai__help {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #718096);
  margin: 0;
  font-style: italic;
}

/* Textarea */
.recipe-form-ai__textarea {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.6;
  color: var(--color-text-primary, #2c3e50);
  background-color: var(--color-background, #ffffff);
  border: 2px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  resize: vertical;
  min-height: 300px;
  transition: border-color 0.2s ease;
}

.recipe-form-ai__textarea:focus {
  outline: none;
  border-color: var(--color-primary, #3182ce);
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.recipe-form-ai__textarea:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
  opacity: 0.6;
}

.recipe-form-ai__textarea::placeholder {
  color: #a0aec0;
}

/* Character count */
.recipe-form-ai__character-count {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #718096);
  margin: 0;
}

.recipe-form-ai__character-count--error {
  color: var(--color-danger, #dc3545);
  font-weight: 600;
}

/* Erreur de mutation */
.recipe-form-ai__error {
  background-color: #fee;
  border: 1px solid var(--color-danger, #dc3545);
  border-radius: 8px;
  padding: 16px;
}

.recipe-form-ai__error-message {
  font-size: 1rem;
  color: var(--color-danger, #dc3545);
  margin: 0;
}

/* Actions */
.recipe-form-ai__actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
}

/* Responsive */
@media (min-width: 640px) {
  .recipe-form-ai {
    padding: 32px;
  }

  .recipe-form-ai__title {
    font-size: 2.5rem;
  }
}

@media (min-width: 768px) {
  .recipe-form-ai {
    padding: 40px;
  }

  .recipe-form-ai__header {
    margin-bottom: 40px;
  }
}
</style>
