<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import RecipeDetail from '@/components/organisms/RecipeDetail.vue'
import { useRecipe } from '@/composables/useRecipeQueries'

const props = defineProps<{
  uuid: string
  fallbackTitle: string
}>()

const emit = defineEmits<{
  close: []
}>()

const panel = ref<HTMLElement | null>(null)
const recipeUuid = computed(() => props.uuid)
const { data: recipe, isLoading, isError, error, refetch } = useRecipe(recipeUuid)
const title = computed(() => recipe.value?.name || props.fallbackTitle)
let previousActiveElement: HTMLElement | null = null

const close = (): void => emit('close')

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  close()
}

onMounted(async () => {
  previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  panel.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  previousActiveElement?.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <div class="planning-recipe-preview" @click.self="close">
      <section
        ref="panel"
        class="planning-recipe-preview__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="`Aperçu de la recette ${title}`"
        tabindex="-1"
      >
        <header class="planning-recipe-preview__header">
          <div>
            <span>Aperçu de la recette</span>
            <strong :title="title">{{ title }}</strong>
          </div>
          <button type="button" title="Fermer l’aperçu" aria-label="Fermer l’aperçu" @click="close">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div class="planning-recipe-preview__content">
          <div v-if="isLoading" class="planning-recipe-preview__state" aria-live="polite">
            <AppLoader variant="spinner" size="large" />
            <p>Chargement de la recette…</p>
          </div>
          <div v-else-if="isError || !recipe" class="planning-recipe-preview__state planning-recipe-preview__state--error">
            <h2>Chargement impossible</h2>
            <p>{{ error?.message || 'La recette n’est plus disponible.' }}</p>
            <button type="button" @click="refetch()">Réessayer</button>
          </div>
          <RecipeDetail v-else :recipe="recipe" embedded />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.planning-recipe-preview {
  position: fixed;
  z-index: 220;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(29, 34, 30, 0.42);
  backdrop-filter: blur(10px) saturate(115%);
}

.planning-recipe-preview__panel {
  width: min(1480px, calc(100vw - 48px));
  height: min(920px, calc(100vh - 48px));
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background: #fbf8f1;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
}

.planning-recipe-preview__panel:focus {
  outline: none;
}

.planning-recipe-preview__header {
  position: relative;
  z-index: 2;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px 10px 18px;
  border-bottom: 1px solid rgba(87, 83, 78, 0.14);
  background: rgba(255, 255, 255, 0.92);
}

.planning-recipe-preview__header > div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.planning-recipe-preview__header > div > span {
  color: var(--color-text-tertiary);
  font-size: 0.68rem;
  font-weight: 760;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.planning-recipe-preview__header strong {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planning-recipe-preview__header > button {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
}

.planning-recipe-preview__header > button > span {
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1;
}

.planning-recipe-preview__header > button:hover,
.planning-recipe-preview__header > button:focus-visible {
  border-color: color-mix(in srgb, var(--color-danger) 34%, var(--color-border));
  color: var(--color-danger);
}

.planning-recipe-preview__content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.planning-recipe-preview__content :deep(.recipe-detail__header-actions) {
  display: none;
}

.planning-recipe-preview__state {
  min-height: 55vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px;
  text-align: center;
}

.planning-recipe-preview__state h2,
.planning-recipe-preview__state p {
  margin: 0;
}

.planning-recipe-preview__state p {
  color: var(--color-text-secondary);
}

.planning-recipe-preview__state--error h2,
.planning-recipe-preview__state--error p {
  color: var(--color-danger);
}

.planning-recipe-preview__state button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

@media (max-width: 620px) {
  .planning-recipe-preview {
    padding: 0;
  }

  .planning-recipe-preview__panel {
    width: 100vw;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .planning-recipe-preview__header > div > span {
    display: none;
  }
}
</style>
