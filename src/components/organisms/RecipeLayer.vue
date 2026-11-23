<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppLoader from '@/components/atoms/AppLoader.vue'
import RecipeDetail from '@/components/organisms/RecipeDetail.vue'
import RecipeForm from '@/components/organisms/RecipeForm.vue'
import { useRecipe } from '@/composables/useRecipeQueries'

const props = defineProps<{
  uuid: string
  fallbackTitle: string
  expanded: boolean
}>()

const emit = defineEmits<{
  close: []
  minimize: []
  titleChange: [title: string]
}>()

const mode = ref<'detail' | 'edit'>('detail')
const panel = ref<HTMLElement | null>(null)
const recipeUuid = computed(() => props.uuid)
const { data: recipe, isLoading, isError, error, refetch } = useRecipe(recipeUuid)
const layerTitle = computed(() => recipe.value?.name || props.fallbackTitle)

watch(
  () => recipe.value?.name,
  (title) => {
    if (title) emit('titleChange', title)
  },
  { immediate: true },
)

watch(
  () => props.expanded,
  async (expanded) => {
    if (!expanded) return
    await nextTick()
    panel.value?.focus({ preventScroll: true })
  },
  { immediate: true },
)

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !props.expanded) return
  event.preventDefault()
  emit('minimize')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-show="expanded" class="recipe-layer" :aria-hidden="!expanded">
      <section
        ref="panel"
        class="recipe-layer__panel"
        role="dialog"
        :aria-label="`Fiche recette ${layerTitle}`"
        tabindex="-1"
      >
        <header class="recipe-layer__header">
          <div class="recipe-layer__identity">
            <strong :title="layerTitle">{{ layerTitle }}</strong>
          </div>
          <div class="recipe-layer__actions">
            <button
              type="button"
              class="recipe-layer__action"
              title="Réduire la fiche"
              aria-label="Réduire la fiche"
              @click="$emit('minimize')"
            >
              <span aria-hidden="true">—</span>
            </button>
            <button
              type="button"
              class="recipe-layer__action recipe-layer__action--close"
              title="Fermer la fiche"
              aria-label="Fermer la fiche"
              @click="$emit('close')"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>

        <div class="recipe-layer__content" :class="{ 'recipe-layer__content--edit': mode === 'edit' }">
          <div v-if="isLoading" class="recipe-layer__state" aria-live="polite">
            <AppLoader variant="spinner" size="large" />
            <p>Chargement de la recette…</p>
          </div>

          <div v-else-if="isError || !recipe" class="recipe-layer__state recipe-layer__state--error">
            <h2>Chargement impossible</h2>
            <p>{{ error?.message || 'La recette n’est plus disponible.' }}</p>
            <button type="button" class="recipe-layer__retry" @click="refetch()">Réessayer</button>
          </div>

          <RecipeDetail
            v-else-if="mode === 'detail'"
            :recipe="recipe"
            embedded
            @back="$emit('minimize')"
            @edit="mode = 'edit'"
          />

          <RecipeForm
            v-else
            :key="recipe.uuid"
            mode="edit"
            :recipe="recipe"
            embedded
            @cancel="mode = 'detail'"
            @deleted="$emit('close')"
            @saved="mode = 'detail'"
          />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.recipe-layer {
  position: fixed;
  z-index: 180;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 32px 32px 78px;
  background: rgba(29, 29, 31, 0.38);
  backdrop-filter: blur(10px) saturate(120%);
}

.recipe-layer__panel {
  width: min(1600px, 100%);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 22px;
  background: #fbf8f1;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
}

.recipe-layer__panel:focus {
  outline: none;
}

.recipe-layer__header {
  position: relative;
  z-index: 2;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px 10px 18px;
  border-bottom: 1px solid rgba(87, 83, 78, 0.14);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
}

.recipe-layer__identity {
  min-width: 0;
}

.recipe-layer__identity strong {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-layer__actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.recipe-layer__action {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  font-weight: 750;
  line-height: 1;
}

.recipe-layer__action:hover {
  border-color: var(--color-border-hover);
  background: var(--color-secondary);
  color: var(--color-text-primary);
}

.recipe-layer__action--close:hover {
  border-color: color-mix(in srgb, var(--color-danger) 38%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 7%, var(--color-surface));
  color: var(--color-danger);
}

.recipe-layer__content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.recipe-layer__content--edit {
  padding: clamp(16px, 3vw, 32px);
  background: var(--color-background);
}

.recipe-layer__content--edit :deep(.recipe-form) {
  width: 100%;
  margin: 0 auto;
}

.recipe-layer__state {
  min-height: 55vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px;
  text-align: center;
}

.recipe-layer__state h2,
.recipe-layer__state p {
  margin: 0;
}

.recipe-layer__state p {
  color: var(--color-text-secondary);
}

.recipe-layer__state--error h2,
.recipe-layer__state--error p {
  color: var(--color-danger);
}

.recipe-layer__retry {
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
  .recipe-layer {
    padding: 0 0 64px;
  }

  .recipe-layer__panel {
    border-inline: 0;
    border-top: 0;
    border-radius: 0 0 18px 18px;
  }

  .recipe-layer__header {
    min-height: 54px;
    padding-inline: 12px 10px;
  }

  .recipe-layer__content--edit {
    padding: 12px;
  }
}
</style>
