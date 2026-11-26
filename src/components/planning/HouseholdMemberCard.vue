<script setup lang="ts">
import { computed } from 'vue'
import type { HouseholdMember } from '@/types/householdMember'

const props = defineProps<{
  member: HouseholdMember
}>()

const emit = defineEmits<{
  edit: [member: HouseholdMember]
}>()

const initials = computed(() =>
  props.member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('fr-FR'))
    .join('') || '?',
)

const ageLabel = computed(() => {
  if (!props.member.birth_year) return ''
  const age = new Date().getFullYear() - props.member.birth_year
  return `${age} ans`
})
</script>

<template>
  <article class="household-member-card">
    <div class="household-member-card__avatar" :style="{ backgroundColor: member.color }" aria-hidden="true">
      <img v-if="member.avatar_data" :src="member.avatar_data" :alt="member.name" />
      <span v-else>{{ initials }}</span>
    </div>
    <div class="household-member-card__body">
      <strong>{{ member.name }}</strong>
      <span v-if="ageLabel">{{ ageLabel }}</span>
    </div>
    <button
      type="button"
      class="household-member-card__edit"
      :aria-label="`Modifier ${member.name}`"
      :title="`Modifier ${member.name}`"
      @click="emit('edit', member)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    </button>
  </article>
</template>

<style scoped>
.household-member-card {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.household-member-card__avatar {
  width: 44px;
  height: 44px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: white;
  font-size: 0.9rem;
  font-weight: 800;
}

.household-member-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.household-member-card__body {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.household-member-card__body strong,
.household-member-card__body span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.household-member-card__body span {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.household-member-card__edit {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.household-member-card__edit:hover {
  border-color: var(--color-border-hover);
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}

.household-member-card__edit svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
</style>
