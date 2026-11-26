<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import PlanningAttendanceView from '@/views/planning/PlanningAttendanceView.vue'
import PlanningMealPreferencesView from '@/views/planning/PlanningMealPreferencesView.vue'
import PlanningPeopleView from '@/views/planning/PlanningPeopleView.vue'
import PlanningPreferencesView from '@/views/planning/PlanningPreferencesView.vue'
import PlanningVacationsView from '@/views/planning/PlanningVacationsView.vue'

export type PlanningSettingsSection = 'hub' | 'people' | 'vacations' | 'attendance' | 'meals'

defineProps<{
  section: PlanningSettingsSection
}>()

const emit = defineEmits<{
  close: []
  navigate: [section: PlanningSettingsSection]
}>()

const closeOnEscape = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', closeOnEscape)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', closeOnEscape)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="planning-settings-modal" @click.self="$emit('close')">
      <section
        class="planning-settings-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Configuration du planning"
      >
        <header class="planning-settings-modal__bar">
          <button
            v-if="section !== 'hub'"
            type="button"
            class="planning-settings-modal__action"
            aria-label="Retour à la configuration"
            title="Retour à la configuration"
            @click="$emit('navigate', 'hub')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span v-else></span>
          <button
            type="button"
            class="planning-settings-modal__action"
            aria-label="Fermer la configuration"
            title="Fermer"
            @click="$emit('close')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="planning-settings-modal__content">
          <PlanningPreferencesView
            v-if="section === 'hub'"
            @navigate="$emit('navigate', $event)"
          />
          <PlanningPeopleView v-else-if="section === 'people'" />
          <PlanningVacationsView v-else-if="section === 'vacations'" />
          <PlanningAttendanceView v-else-if="section === 'attendance'" />
          <PlanningMealPreferencesView v-else />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.planning-settings-modal {
  position: fixed;
  z-index: 220;
  inset: 0;
  display: grid;
  place-items: center;
  padding: clamp(10px, 3vw, 28px);
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(5px);
}

.planning-settings-modal__panel {
  width: min(1120px, 100%);
  max-height: min(920px, calc(100vh - 24px));
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
  box-shadow: var(--shadow-lg);
}

.planning-settings-modal__bar {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.planning-settings-modal__action {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.planning-settings-modal__action:hover {
  border-color: var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}

.planning-settings-modal__action svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.planning-settings-modal__content {
  min-height: 0;
  overflow: auto;
}

@media (max-width: 680px) {
  .planning-settings-modal {
    place-items: stretch;
    padding: 0;
  }

  .planning-settings-modal__panel {
    width: 100%;
    max-height: 100vh;
    border: 0;
    border-radius: 0;
  }
}
</style>
