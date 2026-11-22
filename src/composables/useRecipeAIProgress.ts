import { onBeforeUnmount, ref } from 'vue'
import type { RecipeProcessingRun, RecipeProcessingStage } from '@/types/recipe'

type ProgressLoader = () => Promise<RecipeProcessingRun | null>

export function useRecipeAIProgress(loadRun: ProgressLoader) {
  const isVisible = ref(false)
  const stage = ref<RecipeProcessingStage>('starting')
  const completedStages = ref<RecipeProcessingStage[]>([])
  let pollTimer: number | null = null
  let terminalTimer: number | null = null
  let pollPending = false
  let finalized = false

  const clearTimers = (): void => {
    if (pollTimer !== null) window.clearInterval(pollTimer)
    if (terminalTimer !== null) window.clearTimeout(terminalTimer)
    pollTimer = null
    terminalTimer = null
  }

  const poll = async (): Promise<void> => {
    if (pollPending || finalized || !isVisible.value) return
    pollPending = true
    try {
      const run = await loadRun()
      if (finalized || !isVisible.value || !run) return
      if (
        run.metadata.current_stage
        && !(stage.value === 'reading_source' && run.metadata.current_stage === 'starting')
      ) {
        stage.value = run.metadata.current_stage
      }
      if (run.metadata.stage_history) completedStages.value = run.metadata.stage_history
    } catch {
      // Le traitement principal reste autoritaire ; le suivi ne doit jamais l'interrompre.
    } finally {
      pollPending = false
    }
  }

  const start = (initialStage: RecipeProcessingStage = 'starting'): void => {
    clearTimers()
    finalized = false
    stage.value = initialStage
    completedStages.value = [initialStage]
    isVisible.value = true
    void poll()
    pollTimer = window.setInterval(() => {
      void poll()
    }, 450)
  }

  const finish = (terminalStage: 'complete' | 'failed', displayMs: number): void => {
    finalized = true
    if (pollTimer !== null) window.clearInterval(pollTimer)
    pollTimer = null
    stage.value = terminalStage
    if (!completedStages.value.includes(terminalStage)) {
      completedStages.value = [...completedStages.value, terminalStage]
    }
    terminalTimer = window.setTimeout(() => {
      isVisible.value = false
      terminalTimer = null
    }, displayMs)
  }

  const complete = (): void => finish('complete', 900)
  const fail = (): void => finish('failed', 1300)

  const stop = (): void => {
    finalized = true
    clearTimers()
    isVisible.value = false
  }

  onBeforeUnmount(stop)

  return {
    isVisible,
    stage,
    completedStages,
    start,
    complete,
    fail,
    stop,
  }
}
