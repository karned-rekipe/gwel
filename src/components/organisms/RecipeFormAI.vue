<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/atoms/AppButton.vue'
import { useCreateRecipeWithAI } from '@/composables/useRecipeQueries'

const router = useRouter()
const rawText = ref('')

const { mutate: createRecipeWithAI, isPending, isError, error } = useCreateRecipeWithAI()

const isFormValid = computed(() => rawText.value.trim().length >= 10)

const handleCancel = (): void => {
  router.push({ name: 'recipes-home' })
}

const handleSubmit = (): void => {
  if (!isFormValid.value) {
    return
  }

  createRecipeWithAI(rawText.value, {
    onSuccess: ({ recipe_uuid }) => {
      router.push({ name: 'recipes-detail', params: { id: recipe_uuid } })
    },
  })
}
</script>

<template>
  <section class="recipe-form-ai">
    <header class="recipe-form-ai__header">
      <h2 class="recipe-form-ai__title">Ajout assisté par IA</h2>
      <p class="recipe-form-ai__subtitle">
        Colle une recette brute, OCR ou Web. L’agent structure la fiche puis l’enregistre côté
        backend.
      </p>
    </header>

    <form class="recipe-form-ai__form" @submit.prevent="handleSubmit">
      <div class="recipe-form-ai__field">
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
        class="recipe-form-ai__hint"
        :class="{ 'recipe-form-ai__hint--error': rawText.length > 0 && rawText.length < 10 }"
      >
        {{ rawText.length }} caractères saisis
      </p>

      <div v-if="isError" class="recipe-form-ai__error" role="alert">
        {{ error?.message || 'Le traitement IA a échoué.' }}
      </div>

      <div class="recipe-form-ai__actions">
        <AppButton type="button" variant="secondary" :disabled="isPending" @click="handleCancel">
          Annuler
        </AppButton>
        <AppButton type="submit" variant="primary" :disabled="!isFormValid || isPending">
          {{ isPending ? 'Traitement en cours…' : 'Structurer avec IA' }}
        </AppButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.recipe-form-ai {
  max-width: 960px;
  padding: 26px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(109, 78, 40, 0.08);
  box-shadow: 0 20px 38px rgba(81, 58, 19, 0.06);
}

.recipe-form-ai__header {
  margin-bottom: 18px;
}

.recipe-form-ai__title {
  margin: 0 0 10px;
  color: #2f2112;
  font-size: 1.5rem;
  font-weight: 800;
}

.recipe-form-ai__subtitle,
.recipe-form-ai__hint {
  margin: 0;
  color: #6f5737;
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

.recipe-form-ai__label {
  color: #6f5737;
  font-size: 0.92rem;
  font-weight: 700;
}

.recipe-form-ai__textarea {
  width: 100%;
  min-height: 320px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 2px solid #ebdcc1;
  background: #fffdf9;
  color: #2f2112;
  font: inherit;
  resize: vertical;
}

.recipe-form-ai__textarea:focus {
  outline: none;
  border-color: #ff9a53;
  box-shadow: 0 0 0 3px rgba(255, 154, 83, 0.14);
}

.recipe-form-ai__hint--error {
  color: #b42318;
  font-weight: 700;
}

.recipe-form-ai__error {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 239, 240, 0.9);
  border: 1px solid rgba(225, 29, 72, 0.18);
  color: #a3123c;
  font-weight: 700;
}

.recipe-form-ai__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
