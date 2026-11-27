<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { membersForIds, initialsFor, textColorFor } from '@/components/planning/memberDisplay'
import { useScreenWakeLock } from '@/composables/useScreenWakeLock'
import type { HouseholdMember } from '@/types/householdMember'
import type {
  MealItem,
  RecipePreparationProgress,
  RecipePreparationTimer,
} from '@/types/mealPlan'
import type { Recipe, RecipeStep } from '@/types/recipe'
import {
  assignedServingsFor,
  createPreparationProgress,
  equipmentPreparationId,
  formatIngredientQuantity,
  ingredientPreparationId,
  preparationTimerId,
  remainingTimerSeconds,
  ringingTimerSeconds,
  scaleIngredientQuantity,
  stepPreparationId,
  timerDurationMinutes,
  timerProgressPercent,
  type PreparationTimeKind,
} from '@/utils/recipePreparation'

interface TimerDefinition {
  id: string
  kind: PreparationTimeKind
  label: string
  durationSeconds: number
}

const props = defineProps<{
  recipe: Recipe
  item: MealItem
  householdMembers: HouseholdMember[]
  fallbackMemberIds: string[]
  fallbackHeadcount?: number | null
}>()

const emit = defineEmits<{
  progressChange: [progress: RecipePreparationProgress]
}>()

const {
  errorMessage: wakeLockError,
  isActive: isWakeLockActive,
  isSupported: isWakeLockSupported,
  secureContext,
  status: wakeLockStatus,
  toggle: toggleWakeLock,
} = useScreenWakeLock(true)
const wakeLockLabel = computed(() => {
  if (isWakeLockActive.value) return 'Écran maintenu allumé'
  if (!isWakeLockSupported.value) return 'Maintien de l’écran indisponible'
  if (wakeLockStatus.value === 'error') return 'Réessayer le maintien de l’écran'
  if (wakeLockStatus.value === 'activating') return 'Activation du maintien de l’écran…'
  return 'Garder l’écran allumé'
})
const wakeLockHint = computed(() => {
  if (!secureContext) return 'Disponible lorsque Rekipe est ouvert en HTTPS.'
  if (!isWakeLockSupported.value) return 'Ce navigateur ne prend pas en charge cette fonction.'
  return wakeLockError.value ?? undefined
})

const nowMs = ref(Date.now())
const resolvedMemberIds = computed(() => (
  props.item.member_ids?.length ? props.item.member_ids : props.fallbackMemberIds
))
const assignedMembers = computed(() => membersForIds(resolvedMemberIds.value, props.householdMembers))
const initialTargetServings = computed(() => assignedServingsFor(
  props.item.headcount,
  assignedMembers.value.length,
  props.fallbackHeadcount,
  props.recipe.servings,
))
const progress = ref<RecipePreparationProgress>(createPreparationProgress(initialTargetServings.value))

watch(
  [() => props.item.uuid, () => props.item.preparation_progress, initialTargetServings],
  () => {
    progress.value = createPreparationProgress(initialTargetServings.value, props.item.preparation_progress)
  },
  { deep: true, immediate: true },
)

const persist = (next: RecipePreparationProgress): void => {
  progress.value = next
  emit('progressChange', next)
}

const updateCompleted = (
  field: 'completed_ingredient_ids' | 'completed_equipment_ids' | 'completed_step_ids',
  id: string,
  checked: boolean,
): void => {
  const current = new Set(progress.value[field])
  if (checked) current.add(id)
  else current.delete(id)
  persist({ ...progress.value, [field]: [...current] })
}

const toggleCompleted = (
  field: 'completed_ingredient_ids' | 'completed_equipment_ids' | 'completed_step_ids',
  id: string,
): void => {
  updateCompleted(field, id, !progress.value[field].includes(id))
}

const setAllCompleted = (
  field: 'completed_ingredient_ids' | 'completed_equipment_ids' | 'completed_step_ids',
  ids: string[],
): void => {
  const allCompleted = ids.length > 0 && ids.every((id) => progress.value[field].includes(id))
  persist({ ...progress.value, [field]: allCompleted ? [] : [...ids] })
}

const ingredientIds = computed(() => props.recipe.ingredients.map(ingredientPreparationId))
const equipmentIds = computed(() => props.recipe.equipment.map(equipmentPreparationId))
const stepIds = computed(() => props.recipe.steps.map(stepPreparationId))

const allIngredientsCompleted = computed(() => (
  ingredientIds.value.length > 0
  && ingredientIds.value.every((id) => progress.value.completed_ingredient_ids.includes(id))
))
const allEquipmentCompleted = computed(() => (
  equipmentIds.value.length > 0
  && equipmentIds.value.every((id) => progress.value.completed_equipment_ids.includes(id))
))
const allStepsCompleted = computed(() => (
  stepIds.value.length > 0
  && stepIds.value.every((id) => progress.value.completed_step_ids.includes(id))
))

const changeTargetServings = (delta: number): void => {
  const targetServings = Math.min(99, Math.max(1, progress.value.target_servings + delta))
  if (targetServings === progress.value.target_servings) return
  persist({ ...progress.value, target_servings: targetServings })
}

const scaledQuantity = (quantity: number): string => formatIngredientQuantity(
  scaleIngredientQuantity(quantity, props.recipe.servings, progress.value.target_servings),
)

const timerDefinitionsFor = (step: RecipeStep, stepIndex: number): TimerDefinition[] => {
  const definitions: Array<{ kind: PreparationTimeKind; label: string }> = [
    { kind: 'preparation', label: 'Préparation' },
    { kind: 'cooking', label: 'Cuisson' },
    { kind: 'rest', label: 'Repos' },
  ]
  return definitions.flatMap(({ kind, label }) => {
    const minutes = timerDurationMinutes(step, kind)
    if (minutes <= 0) return []
    return [{
      id: preparationTimerId(step, stepIndex, kind),
      kind,
      label,
      durationSeconds: Math.max(1, Math.round(minutes * 60)),
    }]
  })
}

const timerFor = (timerId: string): RecipePreparationTimer | null => (
  progress.value.timers.find((timer) => timer.timer_id === timerId) ?? null
)

const displayedRemaining = (definition: TimerDefinition): number => {
  const timer = timerFor(definition.id)
  return timer ? remainingTimerSeconds(timer, nowMs.value) : definition.durationSeconds
}

const replaceTimer = (timer: RecipePreparationTimer): void => {
  persist({
    ...progress.value,
    timers: [...progress.value.timers.filter((current) => current.timer_id !== timer.timer_id), timer],
  })
}

let audioContext: AudioContext | null = null
let lastAlarmToneAt = 0

const prepareAudio = (): void => {
  try {
    audioContext ??= new AudioContext()
    void audioContext.resume()
  } catch {
    // Le navigateur peut refuser l'audio ; le signal visuel reste disponible.
  }
}

const playAlarmTone = (): void => {
  try {
    prepareAudio()
    if (!audioContext) return
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.34)
  } catch {
    // L'état visuel reste la source de vérité si le navigateur bloque le son.
  }
}

const startTimer = (definition: TimerDefinition): void => {
  prepareAudio()
  const existing = timerFor(definition.id)
  const remaining = existing && !['completed', 'ringing'].includes(existing.status)
    ? Math.max(1, displayedRemaining(definition))
    : definition.durationSeconds
  replaceTimer({
    timer_id: definition.id,
    duration_seconds: definition.durationSeconds,
    remaining_seconds: remaining,
    status: 'running',
    started_at: new Date().toISOString(),
    ringing_since: null,
  })
}

const pauseTimer = (definition: TimerDefinition): void => {
  replaceTimer({
    timer_id: definition.id,
    duration_seconds: definition.durationSeconds,
    remaining_seconds: displayedRemaining(definition),
    status: 'paused',
    started_at: null,
    ringing_since: null,
  })
}

const dismissTimer = (definition: TimerDefinition): void => {
  replaceTimer({
    timer_id: definition.id,
    duration_seconds: definition.durationSeconds,
    remaining_seconds: 0,
    status: 'completed',
    started_at: null,
    ringing_since: null,
  })
}

const resetTimer = (definition: TimerDefinition): void => {
  persist({
    ...progress.value,
    timers: progress.value.timers.filter((timer) => timer.timer_id !== definition.id),
  })
}

const formatCountdown = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

const formatInitialDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (!remainingSeconds) return `${minutes} min`
  return `${minutes} min ${remainingSeconds} s`
}

const timerStateLabel = (definition: TimerDefinition): string => {
  const status = timerFor(definition.id)?.status
  if (status === 'running') return 'en cours'
  if (status === 'paused') return 'en pause'
  if (status === 'ringing') return 'alarme en cours'
  if (status === 'completed') return 'terminé'
  return 'à lancer'
}

const timerDisplayValue = (definition: TimerDefinition): string => {
  const timer = timerFor(definition.id)
  if (timer?.status === 'ringing') {
    return `+${formatCountdown(ringingTimerSeconds(timer, nowMs.value))}`
  }
  return formatCountdown(displayedRemaining(definition))
}

const timerTimeAriaLabel = (definition: TimerDefinition): string => (
  timerFor(definition.id)?.status === 'ringing'
    ? `sonne depuis ${timerDisplayValue(definition)}`
    : `${timerDisplayValue(definition)} restantes`
)

const displayedProgress = (definition: TimerDefinition): number => timerProgressPercent(
  definition.durationSeconds,
  displayedRemaining(definition),
)

const ringExpiredTimers = (): void => {
  const expiredIds = progress.value.timers
    .filter((timer) => timer.status === 'running' && remainingTimerSeconds(timer, nowMs.value) === 0)
    .map((timer) => timer.timer_id)
  const hasLegacyRingingTimer = progress.value.timers.some(
    (timer) => timer.status === 'ringing' && !timer.ringing_since,
  )
  if (expiredIds.length || hasLegacyRingingTimer) {
    const expired = new Set(expiredIds)
    const ringingNow = new Date(nowMs.value).toISOString()
    persist({
      ...progress.value,
      timers: progress.value.timers.map((timer) => {
        if (expired.has(timer.timer_id)) {
          const startedAtMs = timer.started_at ? Date.parse(timer.started_at) : Number.NaN
          const expiredAtMs = startedAtMs + timer.remaining_seconds * 1000
          return {
            ...timer,
            remaining_seconds: 0,
            status: 'ringing',
            started_at: null,
            ringing_since: Number.isFinite(expiredAtMs)
              ? new Date(expiredAtMs).toISOString()
              : ringingNow,
          }
        }
        if (timer.status === 'ringing' && !timer.ringing_since) {
          return { ...timer, ringing_since: ringingNow }
        }
        return timer
      }),
    })
  }
  if (progress.value.timers.some((timer) => timer.status === 'ringing') && nowMs.value - lastAlarmToneAt >= 1600) {
    lastAlarmToneAt = nowMs.value
    playAlarmTone()
  }
}

let clock: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  clock = setInterval(() => {
    nowMs.value = Date.now()
    ringExpiredTimers()
  }, 500)
  ringExpiredTimers()
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  void audioContext?.close()
  audioContext = null
})
</script>

<template>
  <article class="meal-preparation">
    <section class="meal-preparation__hero">
      <div class="meal-preparation__intro">
        <div class="meal-preparation__mode-row">
          <button
            type="button"
            class="meal-preparation__wake-lock"
            :class="{ 'is-active': isWakeLockActive }"
            :aria-pressed="isWakeLockActive"
            :aria-label="wakeLockLabel"
            :disabled="!isWakeLockSupported"
            :title="wakeLockHint"
            @click="toggleWakeLock"
          >
            <span aria-hidden="true">☀</span>
            <span>{{ wakeLockLabel }}</span>
          </button>
        </div>
        <h1>{{ recipe.name }}</h1>
        <p v-if="recipe.description">{{ recipe.description }}</p>
      </div>
      <figure class="meal-preparation__media">
        <img v-if="recipe.main_image" :src="recipe.main_image" :alt="recipe.name" />
        <span v-else aria-hidden="true">{{ recipe.name.trim().charAt(0).toLocaleUpperCase('fr-FR') }}</span>
      </figure>
    </section>

    <section class="meal-preparation__assignment" aria-labelledby="meal-preparation-assignment-title">
      <div class="meal-preparation__assignment-copy">
        <h2 id="meal-preparation-assignment-title">Convives</h2>
        <ul v-if="assignedMembers.length" class="meal-preparation__members">
          <li v-for="member in assignedMembers" :key="member.uuid">
            <span
              class="meal-preparation__avatar"
              :style="{ backgroundColor: member.color, color: textColorFor(member.color) }"
              aria-hidden="true"
            >
              <img v-if="member.avatar_data" :src="member.avatar_data" alt="" />
              <span v-else>{{ initialsFor(member.name) }}</span>
            </span>
            {{ member.name }}
          </li>
        </ul>
        <p v-else class="meal-preparation__empty">Aucun convive nommé.</p>
      </div>

      <div class="meal-preparation__servings">
        <span>Nb de personnes</span>
        <div class="meal-preparation__stepper" role="group" aria-label="Nombre de personnes">
          <button
            type="button"
            aria-label="Retirer une personne"
            :disabled="progress.target_servings <= 1"
            @click="changeTargetServings(-1)"
          >
            −
          </button>
          <strong aria-live="polite">{{ progress.target_servings }}</strong>
          <button
            type="button"
            aria-label="Ajouter une personne"
            :disabled="progress.target_servings >= 99"
            @click="changeTargetServings(1)"
          >
            +
          </button>
        </div>
        <small>
          Base de la recette : {{ recipe.servings ?? item.recipe_snapshot?.servings_default ?? '—' }} personne{{ (recipe.servings ?? item.recipe_snapshot?.servings_default ?? 0) > 1 ? 's' : '' }}
        </small>
      </div>
    </section>

    <div class="meal-preparation__grid">
      <section class="meal-preparation__section" aria-labelledby="meal-preparation-ingredients-title">
        <header class="meal-preparation__section-header">
          <div>
            <h2 id="meal-preparation-ingredients-title">Ingrédients</h2>
          </div>
          <button
            v-if="ingredientIds.length"
            type="button"
            class="meal-preparation__toggle-all"
            :aria-pressed="allIngredientsCompleted"
            @click="setAllCompleted('completed_ingredient_ids', ingredientIds)"
          >
            {{ allIngredientsCompleted ? 'Tout décocher' : 'Tout cocher' }}
          </button>
        </header>
        <ul v-if="recipe.ingredients.length" class="meal-preparation__checklist">
          <li
            v-for="(ingredient, index) in recipe.ingredients"
            :key="ingredientPreparationId(ingredient, index)"
            :class="{ 'is-completed': progress.completed_ingredient_ids.includes(ingredientPreparationId(ingredient, index)) }"
          >
            <label
              @pointerdown.stop
              @click.stop.prevent="toggleCompleted('completed_ingredient_ids', ingredientPreparationId(ingredient, index))"
            >
              <input
                type="checkbox"
                :checked="progress.completed_ingredient_ids.includes(ingredientPreparationId(ingredient, index))"
              />
              <span class="meal-preparation__check" aria-hidden="true">✓</span>
              <span class="meal-preparation__quantity">
                <strong>{{ scaledQuantity(ingredient.quantity) }}</strong>
                {{ ingredient.unit }}
              </span>
              <span>{{ ingredient.name }}</span>
            </label>
          </li>
        </ul>
        <p v-else class="meal-preparation__empty">Aucun ingrédient renseigné.</p>
      </section>

      <section class="meal-preparation__section" aria-labelledby="meal-preparation-equipment-title">
        <header class="meal-preparation__section-header">
          <div>
            <h2 id="meal-preparation-equipment-title">Ustensiles</h2>
          </div>
          <button
            v-if="equipmentIds.length"
            type="button"
            class="meal-preparation__toggle-all"
            :aria-pressed="allEquipmentCompleted"
            @click="setAllCompleted('completed_equipment_ids', equipmentIds)"
          >
            {{ allEquipmentCompleted ? 'Tout décocher' : 'Tout cocher' }}
          </button>
        </header>
        <ul v-if="recipe.equipment.length" class="meal-preparation__checklist">
          <li
            v-for="(equipment, index) in recipe.equipment"
            :key="equipmentPreparationId(equipment, index)"
            :class="{ 'is-completed': progress.completed_equipment_ids.includes(equipmentPreparationId(equipment, index)) }"
          >
            <label
              @pointerdown.stop
              @click.stop.prevent="toggleCompleted('completed_equipment_ids', equipmentPreparationId(equipment, index))"
            >
              <input
                type="checkbox"
                :checked="progress.completed_equipment_ids.includes(equipmentPreparationId(equipment, index))"
              />
              <span class="meal-preparation__check" aria-hidden="true">✓</span>
              <span class="meal-preparation__quantity"><strong>{{ equipment.quantity ?? 1 }}×</strong></span>
              <span>{{ equipment.name }}</span>
            </label>
          </li>
        </ul>
        <p v-else class="meal-preparation__empty">Aucun ustensile renseigné.</p>
      </section>

      <section class="meal-preparation__section meal-preparation__section--steps" aria-labelledby="meal-preparation-steps-title">
        <header class="meal-preparation__section-header">
          <div>
            <h2 id="meal-preparation-steps-title">Préparation</h2>
          </div>
          <button
            v-if="stepIds.length"
            type="button"
            class="meal-preparation__toggle-all"
            :aria-pressed="allStepsCompleted"
            @click="setAllCompleted('completed_step_ids', stepIds)"
          >
            {{ allStepsCompleted ? 'Tout décocher' : 'Tout cocher' }}
          </button>
        </header>

        <ol v-if="recipe.steps.length" class="meal-preparation__steps">
          <li
            v-for="(step, index) in recipe.steps"
            :key="stepPreparationId(step, index)"
            :class="{
              'is-completed': progress.completed_step_ids.includes(stepPreparationId(step, index)),
              'is-ringing': timerDefinitionsFor(step, index).some((timer) => timerFor(timer.id)?.status === 'ringing'),
            }"
          >
            <div class="meal-preparation__step-main">
              <label
                class="meal-preparation__step-check"
                @pointerdown.stop
                @click.stop.prevent="toggleCompleted('completed_step_ids', stepPreparationId(step, index))"
              >
                <input
                  type="checkbox"
                  :checked="progress.completed_step_ids.includes(stepPreparationId(step, index))"
                />
                <span class="meal-preparation__check" aria-hidden="true">✓</span>
                <span class="meal-preparation__step-number">{{ index + 1 }}</span>
                <span>
                  <strong>{{ step.name }}</strong>
                  <small v-if="step.description">{{ step.description }}</small>
                </span>
              </label>
            </div>

            <div v-if="timerDefinitionsFor(step, index).length" class="meal-preparation__timers">
              <article
                v-for="timer in timerDefinitionsFor(step, index)"
                :key="timer.id"
                class="meal-preparation__timer"
                :class="{
                  'is-running': timerFor(timer.id)?.status === 'running',
                  'is-ringing': timerFor(timer.id)?.status === 'ringing',
                  'is-completed': timerFor(timer.id)?.status === 'completed',
                }"
                :aria-label="`${timer.label}, durée initiale ${formatInitialDuration(timer.durationSeconds)}, ${timerTimeAriaLabel(timer)}, ${timerStateLabel(timer)}`"
              >
                <div class="meal-preparation__timer-copy">
                  <div class="meal-preparation__timer-label">
                    <span>{{ timer.label }}</span>
                    <small :aria-label="`Durée initiale : ${formatInitialDuration(timer.durationSeconds)}`">
                      {{ formatInitialDuration(timer.durationSeconds) }}
                    </small>
                  </div>
                  <span class="meal-preparation__timer-progress" aria-hidden="true">
                    <span :style="{ width: `${displayedProgress(timer)}%` }"></span>
                  </span>
                </div>
                <div class="meal-preparation__timer-readout">
                  <strong aria-live="polite">{{ timerDisplayValue(timer) }}</strong>
                  <span class="meal-preparation__timer-state" aria-live="assertive">
                    {{ timerStateLabel(timer) }}
                  </span>
                </div>
                <div class="meal-preparation__timer-actions">
                  <button
                    v-if="timerFor(timer.id)?.status !== 'running' && timerFor(timer.id)?.status !== 'ringing'"
                    type="button"
                    class="meal-preparation__timer-action meal-preparation__timer-action--primary"
                    :aria-label="timerFor(timer.id)?.status === 'paused' ? `Reprendre le minuteur ${timer.label}` : `Démarrer le minuteur ${timer.label}`"
                    :title="timerFor(timer.id)?.status === 'paused' ? 'Reprendre' : 'Démarrer'"
                    @click="startTimer(timer)"
                  >
                    <span aria-hidden="true">▶</span>
                  </button>
                  <button
                    v-if="timerFor(timer.id)?.status === 'running'"
                    type="button"
                    class="meal-preparation__timer-action meal-preparation__timer-action--primary"
                    :aria-label="`Mettre en pause le minuteur ${timer.label}`"
                    title="Pause"
                    @click="pauseTimer(timer)"
                  >
                    <span aria-hidden="true">Ⅱ</span>
                  </button>
                  <button
                    v-if="timerFor(timer.id)?.status === 'ringing'"
                    type="button"
                    class="meal-preparation__timer-action meal-preparation__alarm-stop"
                    :aria-label="`Arrêter l’alarme du minuteur ${timer.label}`"
                    title="Arrêter l’alarme"
                    @click="dismissTimer(timer)"
                  >
                    <span aria-hidden="true">■</span>
                  </button>
                  <button
                    v-if="timerFor(timer.id)"
                    type="button"
                    class="meal-preparation__timer-action meal-preparation__timer-reset"
                    :aria-label="`Réinitialiser le minuteur ${timer.label}`"
                    title="Réinitialiser"
                    @click="resetTimer(timer)"
                  >
                    <span aria-hidden="true">■</span>
                  </button>
                </div>
              </article>
            </div>
          </li>
        </ol>
        <p v-else class="meal-preparation__empty">Aucune étape renseignée.</p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.meal-preparation {
  --preparation-accent: #6f4a2b;
  --preparation-accent-soft: #f3e8da;
  --preparation-green: #52705d;
  width: min(1320px, 100%);
  margin: 0 auto;
  padding: clamp(18px, 3vw, 38px) clamp(16px, 3.4vw, 44px) 64px;
  color: var(--color-text-primary);
}

.meal-preparation__hero {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(320px, 1.18fr);
  gap: clamp(22px, 4vw, 54px);
  align-items: center;
}

.meal-preparation__intro { min-width: 0; }
.meal-preparation__mode-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
}

.meal-preparation__wake-lock {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border: 1px solid #d2c8bb;
  border-radius: 999px;
  background: #fffdfa;
  color: var(--preparation-accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 750;
  line-height: 1.2;
  text-align: left;
}

.meal-preparation__wake-lock > span:first-child { font-size: 0.88rem; }
.meal-preparation__wake-lock:hover:not(:disabled) { background: var(--preparation-accent-soft); }
.meal-preparation__wake-lock:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
.meal-preparation__wake-lock.is-active {
  border-color: var(--preparation-green);
  background: #edf4ef;
  color: #365342;
}
.meal-preparation__wake-lock:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.meal-preparation__intro h1 {
  margin: 10px 0 16px;
  color: #211f1d;
  font-size: clamp(2.4rem, 6vw, 5.4rem);
  letter-spacing: -0.055em;
  line-height: 0.95;
}

.meal-preparation__intro p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: clamp(1rem, 1.6vw, 1.28rem);
  line-height: 1.65;
}

.meal-preparation__media {
  min-height: 300px;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  display: grid;
  place-items: center;
  margin: 0;
  border-radius: 30px;
  background: linear-gradient(135deg, var(--preparation-accent-soft), #d8c1a6);
  color: var(--preparation-accent);
  font-size: 5rem;
  font-weight: 800;
  box-shadow: 0 18px 45px rgba(65, 49, 35, 0.16);
}

.meal-preparation__media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.meal-preparation__assignment {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  margin-top: clamp(30px, 5vw, 62px);
  padding: clamp(20px, 3vw, 32px);
  border: 1px solid #d9d2c8;
  border-radius: 24px;
  background: #fffdfa;
  box-shadow: 0 12px 32px rgba(65, 49, 35, 0.06);
}

.meal-preparation__assignment-copy h2,
.meal-preparation__section-header h2 {
  margin: 5px 0 0;
  color: var(--preparation-accent);
  font-size: clamp(1.35rem, 2.2vw, 1.85rem);
  letter-spacing: -0.025em;
}

.meal-preparation__members {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.meal-preparation__members li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px 6px 6px;
  border-radius: 999px;
  background: #f2f1ed;
  font-size: 0.86rem;
  font-weight: 700;
}

.meal-preparation__avatar {
  width: 30px;
  height: 30px;
  overflow: hidden;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.68rem;
  font-weight: 850;
}

.meal-preparation__avatar img { width: 100%; height: 100%; object-fit: cover; }

.meal-preparation__servings {
  min-width: 240px;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding-left: 28px;
  border-left: 1px solid #ded8cf;
}

.meal-preparation__servings > span,
.meal-preparation__servings small { color: var(--color-text-secondary); }
.meal-preparation__servings > span { font-size: 0.78rem; font-weight: 750; }
.meal-preparation__servings small { font-size: 0.7rem; }

.meal-preparation__stepper {
  display: grid;
  grid-template-columns: 46px 64px 46px;
  align-items: center;
  overflow: hidden;
  border: 1px solid #cfc6ba;
  border-radius: 14px;
  background: white;
}

.meal-preparation__stepper button {
  width: 46px;
  height: 46px;
  border: 0;
  background: transparent;
  color: var(--preparation-accent);
  font: inherit;
  font-size: 1.55rem;
  cursor: pointer;
}

.meal-preparation__stepper button:hover:not(:disabled) { background: var(--preparation-accent-soft); }
.meal-preparation__stepper button:disabled { cursor: not-allowed; opacity: 0.35; }
.meal-preparation__stepper strong { text-align: center; font-size: 1.35rem; }

.meal-preparation__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.meal-preparation__section {
  min-width: 0;
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid #ded7cc;
  border-radius: 24px;
  background: #fffdfa;
}

.meal-preparation__section--steps {
  grid-column: 1 / -1;
  padding-inline: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.meal-preparation__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.meal-preparation__toggle-all {
  min-height: 38px;
  padding: 8px 13px;
  border: 1px solid #cfc6ba;
  border-radius: 10px;
  background: white;
  color: var(--preparation-accent);
  font: inherit;
  font-size: 0.77rem;
  font-weight: 750;
  cursor: pointer;
}

.meal-preparation__toggle-all:hover { background: var(--preparation-accent-soft); }
.meal-preparation__checklist,
.meal-preparation__steps { margin: 0; padding: 0; list-style: none; }
.meal-preparation__checklist li + li { border-top: 1px solid #e2ddd5; }
.meal-preparation__checklist label {
  min-height: 56px;
  display: grid;
  grid-template-columns: 28px minmax(92px, auto) minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 9px 4px;
  cursor: pointer;
  touch-action: manipulation;
}

.meal-preparation__checklist input,
.meal-preparation__step-check input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.meal-preparation__check {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 2px solid #b8b2aa;
  border-radius: 8px;
  color: transparent;
  font-size: 0.85rem;
  font-weight: 900;
  transition: 140ms ease;
}

input:focus-visible + .meal-preparation__check { outline: 3px solid var(--color-focus); outline-offset: 2px; }
input:checked + .meal-preparation__check {
  border-color: var(--preparation-green);
  background: var(--preparation-green);
  color: white;
}

.meal-preparation__quantity { color: var(--color-text-secondary); white-space: nowrap; }
.meal-preparation__quantity strong { color: var(--color-text-primary); font-size: 1.02rem; }
.meal-preparation__checklist .is-completed label > span:last-child,
.meal-preparation__steps > .is-completed .meal-preparation__step-main { opacity: 0.5; text-decoration: line-through; }

.meal-preparation__steps { display: grid; gap: 14px; }
.meal-preparation__steps > li {
  overflow: hidden;
  border: 1px solid #ddd6cb;
  border-radius: 18px;
  background: white;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.meal-preparation__steps > li.is-ringing {
  border-color: #c83c32;
  box-shadow: 0 0 0 4px rgba(200, 60, 50, 0.15), 0 12px 30px rgba(148, 43, 36, 0.13);
}

.meal-preparation__step-main { padding: 18px; }
.meal-preparation__step-check {
  display: grid;
  grid-template-columns: 28px 42px minmax(0, 1fr);
  gap: 13px;
  align-items: start;
  cursor: pointer;
  touch-action: manipulation;
}

.meal-preparation__step-number {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--preparation-accent);
  color: white;
  font-weight: 850;
}

.meal-preparation__step-check > span:last-child { display: grid; gap: 8px; }
.meal-preparation__step-check strong { font-size: 1.05rem; }
.meal-preparation__step-check small { color: var(--color-text-secondary); font-size: 0.91rem; line-height: 1.6; }

.meal-preparation__timers {
  overflow: hidden;
  margin: 0 18px 18px 101px;
  border: 1px solid #ddd6cb;
  border-radius: 13px;
  background: #fffdfa;
}

.meal-preparation__timer + .meal-preparation__timer { border-top: 1px solid #e5dfd6; }

.meal-preparation__timer {
  min-height: 54px;
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(62px, auto) auto;
  gap: 10px;
  align-items: center;
  padding: 7px 9px 7px 11px;
  background: #fffdfa;
  transition: background-color 160ms ease, box-shadow 160ms ease;
}

.meal-preparation__timer-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.meal-preparation__timer-label {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.meal-preparation__timer-label > span {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 0.77rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-preparation__timer-label small {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  font-size: 0.63rem;
}

.meal-preparation__timer-progress {
  height: 2px;
  overflow: hidden;
  display: block;
  border-radius: 999px;
  background: #e5dfd6;
}

.meal-preparation__timer-progress > span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--preparation-accent);
  transition: width 300ms linear;
}

.meal-preparation__timer-readout {
  min-width: 62px;
  display: grid;
  justify-items: end;
  gap: 0;
}

.meal-preparation__timer-readout > strong {
  color: var(--preparation-accent);
  font-variant-numeric: tabular-nums;
  font-size: 1rem;
  line-height: 1.05;
  text-align: right;
}

.meal-preparation__timer-state {
  color: var(--color-text-secondary);
  font-size: 0.58rem;
  font-weight: 700;
  white-space: nowrap;
}

.meal-preparation__timer.is-running { background: #f4f7f4; }
.meal-preparation__timer.is-running .meal-preparation__timer-progress > span { background: var(--preparation-green); }
.meal-preparation__timer.is-ringing {
  background: #fff0ee;
  animation: preparation-ring 900ms ease-in-out infinite alternate;
}
.meal-preparation__timer.is-ringing .meal-preparation__timer-readout > strong,
.meal-preparation__timer.is-ringing .meal-preparation__timer-state { color: #a62922; }
.meal-preparation__timer.is-ringing .meal-preparation__timer-progress > span { background: #a62922; }
.meal-preparation__timer.is-completed { background: #f0f2ef; }
.meal-preparation__timer.is-completed .meal-preparation__timer-progress > span { background: var(--preparation-green); }

.meal-preparation__timer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.meal-preparation__timer-action {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 1px solid #cfc6ba;
  border-radius: 50%;
  background: white;
  color: var(--preparation-accent);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 850;
  cursor: pointer;
}

.meal-preparation__timer-action:hover { background: var(--preparation-accent-soft); }
.meal-preparation__timer-action:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
.meal-preparation__timer-action--primary {
  border-color: var(--preparation-accent);
  background: var(--preparation-accent);
  color: white;
}
.meal-preparation__timer-action--primary:hover { background: #57381f; }
.meal-preparation__timer-actions .meal-preparation__alarm-stop {
  border-color: #a62922;
  background: #a62922;
  color: white;
}
.meal-preparation__timer-actions .meal-preparation__alarm-stop:hover { background: #84211c; }
.meal-preparation__timer-actions .meal-preparation__timer-reset { color: var(--color-text-secondary); }
.meal-preparation__empty { margin: 12px 0 0; color: var(--color-text-secondary); }

@keyframes preparation-ring {
  from { box-shadow: 0 0 0 0 rgba(200, 60, 50, 0.08); }
  to { box-shadow: 0 0 0 5px rgba(200, 60, 50, 0.18); }
}

@media (max-width: 880px) {
  .meal-preparation__hero { grid-template-columns: 1fr; }
  .meal-preparation__media { order: -1; min-height: 240px; }
  .meal-preparation__assignment { grid-template-columns: 1fr; }
  .meal-preparation__servings { padding: 20px 0 0; border-top: 1px solid #ded8cf; border-left: 0; }
  .meal-preparation__grid { grid-template-columns: 1fr; }
  .meal-preparation__section--steps { grid-column: auto; }
}

@media (max-width: 600px) {
  .meal-preparation { padding-inline: 12px; }
  .meal-preparation__wake-lock { max-width: 172px; }
  .meal-preparation__media { min-height: 190px; border-radius: 20px; }
  .meal-preparation__assignment,
  .meal-preparation__section { border-radius: 18px; }
  .meal-preparation__section--steps { border-radius: 0; }
  .meal-preparation__section-header { align-items: flex-start; }
  .meal-preparation__checklist label { grid-template-columns: 28px 74px minmax(0, 1fr); gap: 9px; }
  .meal-preparation__step-check {
    grid-template-columns: 34px minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: 12px;
    row-gap: 8px;
  }
  .meal-preparation__step-check .meal-preparation__check {
    grid-column: 1;
    grid-row: 1;
    justify-self: center;
  }
  .meal-preparation__step-number { width: 34px; height: 34px; }
  .meal-preparation__step-check .meal-preparation__step-number {
    grid-column: 1;
    grid-row: 2;
    justify-self: center;
  }
  .meal-preparation__step-check > span:last-child {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .meal-preparation__timers { margin: 0 12px 14px; }
  .meal-preparation__timer {
    grid-template-columns: minmax(110px, 1fr) minmax(56px, auto) auto;
    gap: 7px;
    padding-inline: 9px;
  }
  .meal-preparation__timer-action { width: 30px; height: 30px; }
}

@media (prefers-reduced-motion: reduce) {
  .meal-preparation__timer.is-ringing { animation: none; }
}
</style>
