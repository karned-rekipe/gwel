<script setup lang="ts">
import { computed } from 'vue'
import type { HouseholdMember } from '@/types/householdMember'

const props = defineProps<{
  member: HouseholdMember
}>()

defineEmits<{
  edit: [member: HouseholdMember]
  delete: [member: HouseholdMember]
}>()

const initials = computed(() =>
  props.member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('fr-FR'))
    .join('') || '?',
)

const memberTypeLabel = computed(() => props.member.member_type === 'resident' ? 'Foyer' : 'Invité')
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
      <span>
        {{ memberTypeLabel }}
        <template v-if="ageLabel"> · {{ ageLabel }}</template>
      </span>
    </div>
    <div class="household-member-card__actions">
      <button type="button" @click="$emit('edit', member)">Modifier</button>
      <button type="button" class="household-member-card__danger" @click="$emit('delete', member)">Supprimer</button>
    </div>
  </article>
</template>

<style scoped>
.household-member-card {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
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

.household-member-card__actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
}

.household-member-card__actions button {
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.household-member-card__actions button:hover {
  border-color: var(--color-border-hover);
}

.household-member-card__danger {
  color: var(--color-danger, #b42318) !important;
}
</style>
