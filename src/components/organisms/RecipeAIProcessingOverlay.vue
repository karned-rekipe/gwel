<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  RecipeCreationSourceKind,
  RecipeProcessingStage,
} from '@/types/recipe'

const props = withDefaults(defineProps<{
  stage: RecipeProcessingStage
  completedStages: RecipeProcessingStage[]
  mode?: 'create' | 'enrich' | 'ingredient'
  sourceKind?: RecipeCreationSourceKind
  subject: string
}>(), {
  mode: 'enrich',
  sourceKind: 'text',
})

type StageDefinition = {
  key: RecipeProcessingStage
  icon: string
  label: string
  description: string
}

const sourceStage = computed<StageDefinition>(() => {
  switch (props.sourceKind) {
    case 'link':
      return {
        key: 'reading_source',
        icon: '🔗',
        label: 'Récupération du lien',
        description: 'L’assistant détecte une page Web, une image ou un PDF, puis en extrait le contenu utile.',
      }
    case 'document':
      return {
        key: 'reading_source',
        icon: '📄',
        label: 'Lecture OCR du document',
        description: 'Le service OCR lit l’image ou le PDF pour retrouver fidèlement le texte de la recette.',
      }
    default:
      return {
        key: 'reading_source',
        icon: '✍️',
        label: 'Lecture du texte',
        description: 'Le traitement linguistique prépare le texte libre avant sa structuration en recette.',
      }
  }
})

const stages = computed<StageDefinition[]>(() => [
  {
    key: 'starting',
    icon: '✦',
    label: 'Préparation de l’assistant',
    description: props.mode === 'ingredient'
      ? 'Nous préparons l’espace de travail et ouvrons le suivi de cet ingrédient.'
      : 'Nous préparons l’espace de travail et ouvrons le suivi de cette recette.',
  },
  sourceStage.value,
  {
    key: 'loading_recipe',
    icon: '📖',
    label: props.mode === 'ingredient' ? 'Lecture de l’ingrédient' : 'Lecture de la fiche',
    description: props.mode === 'ingredient'
      ? 'L’assistant charge la fiche actuelle et repère les informations déjà renseignées.'
      : 'L’assistant charge la recette actuelle pour préserver les données déjà structurées.',
  },
  {
    key: 'analyzing',
    icon: '🧠',
    label: props.mode === 'ingredient' ? 'Analyse de l’ingrédient' : 'Analyse de la recette',
    description: props.mode === 'ingredient'
      ? 'Le modèle complète la saisonnalité, la nutrition, l’environnement, les unités et les usages manquants.'
      : 'Le modèle repère les ingrédients, les étapes, l’origine et les informations manquantes.',
  },
  {
    key: 'reviewing',
    icon: '🔎',
    label: 'Vérification du résultat',
    description: props.mode === 'ingredient'
      ? 'Un second passage vérifie que chaque profil demandé est réellement renseigné et cohérent.'
      : 'Un second passage contrôle la cohérence de la structure, des quantités et des temps.',
  },
  {
    key: 'checking_duplicate',
    icon: '🗂️',
    label: 'Recherche d’une recette existante',
    description: 'Le catalogue est consulté pour éviter de créer un doublon sans votre accord.',
  },
  {
    key: 'organizing',
    icon: '🧩',
    label: 'Organisation de la fiche',
    description: 'Les éventuelles sous-recettes et les blocs de préparation sont remis au bon endroit.',
  },
  {
    key: 'ingredients',
    icon: '🥕',
    label: 'Classement des ingrédients',
    description: 'Chaque ingrédient est rapproché du catalogue ou créé lorsqu’aucune correspondance sûre n’existe.',
  },
  {
    key: 'equipment',
    icon: '🍳',
    label: 'Classement des ustensiles',
    description: 'Les équipements nécessaires sont identifiés et reliés aux fiches du catalogue.',
  },
  {
    key: 'tags',
    icon: '🏷️',
    label: 'Sélection des tags',
    description: 'L’assistant retient uniquement les tags pertinents déjà présents dans le catalogue.',
  },
  {
    key: 'saving',
    icon: '💾',
    label: props.mode === 'create'
      ? 'Création de la fiche'
      : props.mode === 'ingredient'
        ? 'Enregistrement des données'
        : 'Enregistrement de la recette',
    description: props.mode === 'create'
      ? 'La nouvelle recette structurée est enregistrée avec ses ingrédients, ses temps et ses étapes.'
      : props.mode === 'ingredient'
        ? 'Les données validées par le relecteur sont préparées puis appliquées à la fiche.'
      : 'La fiche réorganisée est enregistrée tout en conservant ses favoris, tags et données existantes.',
  },
  {
    key: 'image',
    icon: '🖼️',
    label: 'Vérification de l’image',
    description: 'L’assistant conserve l’image actuelle ou en génère une si la recette n’en possède pas encore.',
  },
  {
    key: 'complete',
    icon: '✨',
    label: props.mode === 'create'
      ? 'Recette créée'
      : props.mode === 'ingredient'
        ? 'Complétion terminée'
        : 'Mise à niveau terminée',
    description: props.mode === 'create'
      ? 'La nouvelle fiche est prête et va maintenant être affichée.'
      : props.mode === 'ingredient'
        ? 'La fiche complétée est prête et ses nouvelles données vont maintenant être affichées.'
      : 'La fiche est prête. Les nouvelles données sont en cours d’affichage.',
  },
  {
    key: 'failed',
    icon: '!',
    label: 'Traitement interrompu',
    description: props.mode === 'create'
      ? 'La recette n’a pas pu être créée. Vous allez pouvoir vérifier la source et réessayer.'
      : props.mode === 'ingredient'
        ? 'La complétion n’a pas pu être terminée. La fiche existante reste inchangée.'
      : 'Le traitement n’a pas pu être terminé. La fiche existante reste accessible.',
  },
])

const workflowKeys = computed<RecipeProcessingStage[]>(() => {
  if (props.mode === 'create') {
    return ['reading_source', 'analyzing', 'reviewing', 'checking_duplicate', 'organizing', 'ingredients', 'equipment', 'tags', 'saving', 'image']
  }
  if (props.mode === 'ingredient') return ['loading_recipe', 'analyzing', 'reviewing', 'saving']
  return ['loading_recipe', 'analyzing', 'reviewing', 'organizing', 'ingredients', 'equipment', 'tags', 'saving', 'image']
})
const orderedKeys = computed<RecipeProcessingStage[]>(() => ['starting', ...workflowKeys.value, 'complete'])
const visibleSteps = computed(() => workflowKeys.value
  .map((key) => stages.value.find((item) => item.key === key))
  .filter((item): item is StageDefinition => Boolean(item)))
const startingStage = computed(() => stages.value[0]!)
const currentStage = computed(() => stages.value.find(({ key }) => key === props.stage) ?? startingStage.value)
const currentIndex = computed(() => Math.max(0, orderedKeys.value.indexOf(props.stage)))
const progress = computed(() => {
  if (props.stage === 'failed') return 100
  return Math.max(4, Math.round((currentIndex.value / (orderedKeys.value.length - 1)) * 100))
})
const isCompleted = (stage: RecipeProcessingStage): boolean =>
  (props.completedStages.includes(stage) && stage !== props.stage)
  || currentIndex.value > orderedKeys.value.indexOf(stage)

const elapsedSeconds = ref(0)
let elapsedTimer: number | null = null
let previousBodyOverflow = ''

onMounted(() => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  elapsedTimer = window.setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  if (elapsedTimer !== null) window.clearInterval(elapsedTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="recipe-ai-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-ai-overlay-title"
      aria-describedby="recipe-ai-overlay-description"
    >
      <section class="recipe-ai-overlay__card">
        <p class="recipe-ai-overlay__eyebrow">
          {{ mode === 'ingredient' ? 'Assistant ingrédients' : 'Assistant culinaire' }}
        </p>

        <div class="recipe-ai-overlay__visual" :class="{ 'is-complete': stage === 'complete' }" aria-hidden="true">
          <span class="recipe-ai-overlay__orbit"></span>
          <span class="recipe-ai-overlay__icon">{{ currentStage.icon }}</span>
        </div>

        <div class="recipe-ai-overlay__copy" aria-live="polite" aria-atomic="true">
          <h2 id="recipe-ai-overlay-title">{{ currentStage.label }}</h2>
          <p id="recipe-ai-overlay-description">{{ currentStage.description }}</p>
          <strong>{{ subject }}</strong>
        </div>

        <div class="recipe-ai-overlay__progress" aria-hidden="true">
          <span :style="{ width: `${progress}%` }"></span>
        </div>

        <ol class="recipe-ai-overlay__steps" aria-label="Étapes du traitement">
          <li
            v-for="item in visibleSteps"
            :key="item.key"
            :class="{
              'is-current': item.key === stage,
              'is-completed': isCompleted(item.key),
            }"
          >
            <span aria-hidden="true">{{ isCompleted(item.key) ? '✓' : item.icon }}</span>
            <small>{{ item.label }}</small>
          </li>
        </ol>

        <p class="recipe-ai-overlay__elapsed">
          {{ elapsedSeconds < 2 ? 'Traitement en cours…' : `${elapsedSeconds} s écoulées` }}
          <span>Vous pouvez patienter, la page se mettra à jour automatiquement.</span>
        </p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.recipe-ai-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow-y: auto;
  background:
    radial-gradient(circle at 50% 12%, color-mix(in srgb, var(--color-primary) 24%, transparent), transparent 42%),
    color-mix(in srgb, #101713 88%, transparent);
  backdrop-filter: blur(12px);
}

.recipe-ai-overlay__card {
  width: min(760px, 100%);
  padding: clamp(28px, 5vw, 48px);
  border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
  border-radius: 28px;
  background: color-mix(in srgb, var(--color-surface) 96%, transparent);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
  color: var(--color-text-primary);
  text-align: center;
}

.recipe-ai-overlay__eyebrow {
  margin: 0 0 20px;
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.recipe-ai-overlay__visual {
  position: relative;
  width: 124px;
  height: 124px;
  display: grid;
  place-items: center;
  margin: 0 auto 24px;
}

.recipe-ai-overlay__orbit {
  position: absolute;
  inset: 0;
  border: 3px solid color-mix(in srgb, var(--color-primary) 16%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: recipe-ai-spin 1.25s linear infinite;
}

.recipe-ai-overlay__visual.is-complete .recipe-ai-overlay__orbit {
  border-color: color-mix(in srgb, #34c759 65%, transparent);
  animation: none;
}

.recipe-ai-overlay__icon {
  width: 90px;
  height: 90px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 11%, var(--color-surface));
  font-size: 3.4rem;
  line-height: 1;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.recipe-ai-overlay__copy h2 {
  margin: 0;
  font-size: clamp(1.55rem, 4vw, 2.35rem);
  line-height: 1.15;
}

.recipe-ai-overlay__copy p {
  max-width: 610px;
  min-height: 48px;
  margin: 12px auto 8px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.recipe-ai-overlay__copy strong {
  display: block;
  overflow: hidden;
  color: var(--color-primary);
  font-size: 0.92rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-ai-overlay__progress {
  height: 7px;
  margin: 26px 0 20px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-border) 72%, transparent);
}

.recipe-ai-overlay__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), #34c759);
  transition: width 420ms ease;
}

.recipe-ai-overlay__steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recipe-ai-overlay__steps li {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 9px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-border));
  color: var(--color-text-tertiary);
  text-align: left;
  transition: border-color 200ms ease, background 200ms ease, color 200ms ease;
}

.recipe-ai-overlay__steps li > span {
  width: 22px;
  height: 22px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-border) 70%, transparent);
  font-size: 0.76rem;
}

.recipe-ai-overlay__steps small {
  overflow: hidden;
  font-size: 0.69rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.recipe-ai-overlay__steps li.is-current {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  color: var(--color-text-primary);
}

.recipe-ai-overlay__steps li.is-completed {
  color: color-mix(in srgb, #16813a 85%, var(--color-text-primary));
}

.recipe-ai-overlay__steps li.is-completed > span {
  background: color-mix(in srgb, #34c759 15%, var(--color-surface));
  color: #16813a;
}

.recipe-ai-overlay__elapsed {
  display: grid;
  gap: 4px;
  margin: 20px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.recipe-ai-overlay__elapsed span {
  color: var(--color-text-tertiary);
  font-size: 0.74rem;
}

@keyframes recipe-ai-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 680px) {
  .recipe-ai-overlay {
    align-items: start;
    padding: 12px;
  }

  .recipe-ai-overlay__card {
    margin: 12px 0;
    padding: 24px 18px;
    border-radius: 22px;
  }

  .recipe-ai-overlay__visual {
    width: 104px;
    height: 104px;
  }

  .recipe-ai-overlay__icon {
    width: 76px;
    height: 76px;
    font-size: 2.8rem;
  }

  .recipe-ai-overlay__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .recipe-ai-overlay__orbit {
    animation-duration: 3s;
  }

  .recipe-ai-overlay__progress span {
    transition: none;
  }
}
</style>
