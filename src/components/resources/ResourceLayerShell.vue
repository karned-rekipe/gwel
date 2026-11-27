<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  resourceLabel: string
  expanded: boolean
  editMode?: boolean
}>(), {
  editMode: false,
})

defineEmits<{
  close: []
  minimize: []
}>()

const panel = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

watch(
  () => props.expanded,
  async (expanded) => {
    if (!expanded) return
    await nextTick()
    panel.value?.focus({ preventScroll: true })
  },
  { immediate: true },
)

watch(
  () => props.editMode,
  async () => {
    await nextTick()
    content.value?.scrollTo({ top: 0, behavior: 'auto' })
  },
)

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !props.expanded) return
  event.preventDefault()
  panel.value?.dispatchEvent(new CustomEvent('resource-layer-escape', { bubbles: true }))
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-show="expanded" class="resource-layer" :aria-hidden="!expanded">
      <section
        ref="panel"
        class="resource-layer__panel"
        role="dialog"
        :aria-label="`${resourceLabel} ${title}`"
        tabindex="-1"
        @resource-layer-escape="$emit('minimize')"
      >
        <header class="resource-layer__header">
          <div class="resource-layer__identity">
            <strong :title="title">{{ title }}</strong>
          </div>
          <div class="resource-layer__actions">
            <slot name="header-actions" />
            <button
              type="button"
              class="resource-layer__action"
              title="Réduire la fiche"
              aria-label="Réduire la fiche"
              @click="$emit('minimize')"
            >
              <span aria-hidden="true">—</span>
            </button>
            <button
              type="button"
              class="resource-layer__action resource-layer__action--close"
              title="Fermer la fiche"
              aria-label="Fermer la fiche"
              @click="$emit('close')"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>
        <div ref="content" class="resource-layer__content" :class="{ 'resource-layer__content--edit': editMode }">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.resource-layer {
  position: fixed;
  z-index: 180;
  inset: 0;
  min-width: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding: 32px 32px 78px;
  background: rgba(29, 29, 31, 0.38);
  backdrop-filter: blur(10px) saturate(120%);
}

.resource-layer__panel {
  width: min(1600px, 100%);
  max-width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 22px;
  background: #fbf8f1;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
}

.resource-layer__panel:focus { outline: none; }

.resource-layer__header {
  position: relative;
  z-index: 2;
  width: 100%;
  min-width: 0;
  min-height: 58px;
  box-sizing: border-box;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 10px 14px 10px 18px;
  border-bottom: 1px solid rgba(87, 83, 78, 0.14);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
}

.resource-layer__identity {
  width: 100%;
  min-width: 0;
  display: block;
  overflow: hidden;
}

.resource-layer__identity strong {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: block;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-layer__actions {
  display: flex;
  min-width: max-content;
  align-items: center;
  justify-self: end;
  gap: 7px;
}

.resource-layer__action {
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

.resource-layer__action:hover {
  border-color: var(--color-border-hover);
  background: var(--color-secondary);
  color: var(--color-text-primary);
}

.resource-layer__action--close:hover {
  border-color: color-mix(in srgb, var(--color-danger) 38%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 7%, var(--color-surface));
  color: var(--color-danger);
}

.resource-layer__content {
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.resource-layer__content--edit {
  padding: clamp(16px, 3vw, 32px);
  background: var(--color-background);
}

@media (max-width: 620px) {
  .resource-layer { padding: 0 0 64px; }
  .resource-layer__panel {
    border-inline: 0;
    border-top: 0;
    border-radius: 0 0 18px 18px;
  }
  .resource-layer__header { min-height: 54px; gap: 10px; padding-inline: 12px 10px; }
  .resource-layer__content--edit { padding: 12px; }
}
</style>
