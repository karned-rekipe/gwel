<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { DEFAULT_NOTIFICATION_DURATION_MS } from '@/utils/notifications'

export type AppToastTone = 'success' | 'warning' | 'error'

const props = withDefaults(defineProps<{
  message?: string | null
  tone?: AppToastTone
  durationMs?: number
}>(), {
  message: null,
  tone: 'success',
  durationMs: DEFAULT_NOTIFICATION_DURATION_MS,
})

const emit = defineEmits<{
  dismiss: []
}>()

let dismissTimer: number | undefined

const title = computed(() => ({
  success: 'Terminé',
  warning: 'À vérifier',
  error: 'Action impossible',
})[props.tone])

const icon = computed(() => ({
  success: '✓',
  warning: '!',
  error: '×',
})[props.tone])

const clearTimer = (): void => {
  if (dismissTimer === undefined) return
  window.clearTimeout(dismissTimer)
  dismissTimer = undefined
}

const dismiss = (): void => {
  clearTimer()
  emit('dismiss')
}

watch(
  () => [props.message, props.durationMs] as const,
  ([message, durationMs]) => {
    clearTimer()
    if (!message || durationMs <= 0) return
    dismissTimer = window.setTimeout(dismiss, durationMs)
  },
  { immediate: true },
)

onBeforeUnmount(clearTimer)
</script>

<template>
  <Teleport to="body">
    <Transition name="app-toast">
      <div v-if="message" class="app-toast__layer">
        <section
          class="app-toast"
          :class="`app-toast--${tone}`"
          :role="tone === 'error' ? 'alert' : 'status'"
          :aria-live="tone === 'error' ? 'assertive' : 'polite'"
          aria-atomic="true"
        >
          <span class="app-toast__icon" aria-hidden="true">{{ icon }}</span>
          <div class="app-toast__content">
            <strong>{{ title }}</strong>
            <p>{{ message }}</p>
          </div>
          <button
            type="button"
            class="app-toast__close"
            aria-label="Fermer la notification"
            title="Fermer"
            @click="dismiss"
          >
            ×
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-toast__layer {
  position: fixed;
  z-index: 700;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  pointer-events: none;
}

.app-toast {
  width: min(560px, calc(100vw - 32px));
  min-height: 96px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 16px 18px 20px;
  border: 1px solid color-mix(in srgb, var(--app-toast-accent) 30%, white);
  border-radius: 20px;
  background: color-mix(in srgb, var(--app-toast-accent) 7%, white);
  color: #172033;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.26), 0 8px 24px rgba(15, 23, 42, 0.14);
  pointer-events: auto;
  backdrop-filter: blur(18px) saturate(135%);
}

.app-toast--success {
  --app-toast-accent: #16803c;
}

.app-toast--warning {
  --app-toast-accent: #b55a00;
}

.app-toast--error {
  --app-toast-accent: #c5162e;
}

.app-toast__icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--app-toast-accent);
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 800;
}

.app-toast__content {
  min-width: 0;
}

.app-toast__content strong {
  display: block;
  margin-bottom: 4px;
  color: var(--app-toast-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.app-toast__content p {
  margin: 0;
  color: #172033;
  font-size: 0.96rem;
  font-weight: 650;
  line-height: 1.5;
}

.app-toast__close {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.06);
  color: #42506a;
  cursor: pointer;
  font: inherit;
  font-size: 1.3rem;
  line-height: 1;
}

.app-toast__close:hover {
  background: rgba(15, 23, 42, 0.11);
  color: #172033;
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
}

@media (max-width: 560px) {
  .app-toast__layer {
    padding: 16px;
  }

  .app-toast {
    width: 100%;
  }
}
</style>
