<script setup lang="ts">
import type { ResourceLayerSession } from '@/utils/resourceLayers'

defineProps<{
  sessions: ResourceLayerSession[]
  activeKey: string | null
}>()

defineEmits<{
  restore: [key: string]
  close: [key: string]
  minimize: [key: string]
}>()

const kindLabels = {
  recipe: 'R',
  ingredient: 'I',
  equipment: 'U',
} as const
</script>

<template>
  <Teleport to="body">
    <aside v-if="sessions.length" class="resource-layer-dock" aria-label="Fiches ouvertes">
      <div class="resource-layer-dock__items">
        <div
          v-for="session in sessions"
          :key="session.key"
          class="resource-layer-dock__item"
          :class="{ 'resource-layer-dock__item--active': activeKey === session.key }"
        >
          <button
            type="button"
            class="resource-layer-dock__restore"
            :aria-pressed="activeKey === session.key"
            :title="`Afficher ${session.title}`"
            @click="$emit('restore', session.key)"
          >
            <span class="resource-layer-dock__kind" aria-hidden="true">{{ kindLabels[session.kind] }}</span>
            <span>{{ session.title }}</span>
          </button>
          <button
            type="button"
            class="resource-layer-dock__close"
            :aria-label="`Fermer ${session.title}`"
            :title="`Fermer ${session.title}`"
            @click="$emit('close', session.key)"
          >×</button>
        </div>
      </div>
      <button
        v-if="activeKey"
        type="button"
        class="resource-layer-dock__minimize"
        title="Réduire la fiche active"
        aria-label="Réduire la fiche active"
        @click="$emit('minimize', activeKey)"
      >—</button>
    </aside>
  </Teleport>
</template>

<style scoped>
.resource-layer-dock {
  position: fixed;
  z-index: 240;
  right: 32px;
  bottom: 6px;
  left: 32px;
  width: auto;
  max-width: 1600px;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 18px;
  background: rgba(249, 249, 250, 0.92);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(18px) saturate(150%);
  margin-inline: auto;
}

.resource-layer-dock__items {
  min-width: 0;
  display: flex;
  flex: 1 1 auto;
  gap: 6px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}

.resource-layer-dock__item {
  min-width: 160px;
  max-width: 280px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.resource-layer-dock__item--active {
  border-color: rgba(29, 29, 31, 0.28);
  background: #ebe9e5;
  box-shadow: inset 0 0 0 1px rgba(29, 29, 31, 0.05);
}

.resource-layer-dock__restore,
.resource-layer-dock__close,
.resource-layer-dock__minimize {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
}

.resource-layer-dock__restore {
  min-width: 0;
  height: 36px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  text-align: left;
}

.resource-layer-dock__restore > span:last-child {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 0.8rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-layer-dock__kind {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: var(--color-secondary);
  color: var(--color-text-secondary);
  font-size: 0.66rem;
  font-weight: 850;
}

.resource-layer-dock__close { width: 30px; height: 36px; font-size: 1rem; font-weight: 700; }
.resource-layer-dock__close:hover { color: var(--color-danger); }

.resource-layer-dock__minimize {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-weight: 800;
}

.resource-layer-dock__minimize:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

@media (max-width: 620px) {
  .resource-layer-dock { right: 7px; bottom: 4px; left: 7px; max-width: none; min-height: 54px; }
  .resource-layer-dock__item { min-width: 150px; }
}
</style>
