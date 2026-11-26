<script setup lang="ts">
import { computed } from 'vue'
import type { HouseholdMember } from '@/types/householdMember'

const props = defineProps<{
  modelValue: string[]
  members: HouseholdMember[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selected = computed(() => new Set(props.modelValue))
const residents = computed(() => props.members.filter((member) => member.member_type === 'resident'))
const recurringGuests = computed(() => props.members.filter((member) => member.member_type === 'recurring_guest'))

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('fr-FR'))
    .join('') || '?'

const textColorFor = (hex: string): string => {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 145 ? '#111827' : '#ffffff'
}

const toggle = (uuid: string): void => {
  const next = new Set(props.modelValue)
  if (next.has(uuid)) {
    next.delete(uuid)
  } else {
    next.add(uuid)
  }
  emit('update:modelValue', Array.from(next))
}
</script>

<template>
  <div v-if="members.length" class="member-selector">
    <section class="member-selector__group" aria-label="Membres du foyer">
      <h3>Membres du foyer</h3>
      <div v-if="residents.length" class="member-selector__pills">
        <button
          v-for="member in residents"
          :key="member.uuid"
          type="button"
          class="member-selector__pill"
          :class="{ 'member-selector__pill--selected': selected.has(member.uuid) }"
          :style="selected.has(member.uuid) ? { backgroundColor: member.color, color: textColorFor(member.color) } : undefined"
          :aria-pressed="selected.has(member.uuid)"
          @click="toggle(member.uuid)"
        >
          <span class="member-selector__avatar" :style="{ backgroundColor: member.color }">
            <img v-if="member.avatar_data" :src="member.avatar_data" :alt="member.name" />
            <span v-else>{{ initialsFor(member.name) }}</span>
          </span>
          <span>{{ member.name.split(' ')[0] }}</span>
        </button>
      </div>
      <span v-else class="member-selector__empty">Aucun membre du foyer</span>
    </section>

    <section class="member-selector__group" aria-label="Invités réguliers">
      <h3>Invités réguliers</h3>
      <div v-if="recurringGuests.length" class="member-selector__pills">
        <button
          v-for="member in recurringGuests"
          :key="member.uuid"
          type="button"
          class="member-selector__pill"
          :class="{ 'member-selector__pill--selected': selected.has(member.uuid) }"
          :style="selected.has(member.uuid) ? { backgroundColor: member.color, color: textColorFor(member.color) } : undefined"
          :aria-pressed="selected.has(member.uuid)"
          @click="toggle(member.uuid)"
        >
          <span class="member-selector__avatar" :style="{ backgroundColor: member.color }">
            <img v-if="member.avatar_data" :src="member.avatar_data" :alt="member.name" />
            <span v-else>{{ initialsFor(member.name) }}</span>
          </span>
          <span>{{ member.name.split(' ')[0] }}</span>
        </button>
      </div>
      <span v-else class="member-selector__empty">Aucun invité régulier</span>
    </section>
  </div>
  <span v-else class="member-selector__empty">Aucune personne</span>
</template>

<style scoped>
.member-selector {
  min-width: 150px;
  display: grid;
  gap: 16px;
}

.member-selector__group {
  display: grid;
  gap: 8px;
}

.member-selector__group h3 {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 780;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.member-selector__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-selector__pill {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
  opacity: 0.72;
}

.member-selector__pill--selected {
  border-color: transparent;
  opacity: 1;
}

.member-selector__avatar {
  width: 20px;
  height: 20px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: white;
  font-size: 0.62rem;
  font-weight: 800;
  flex-shrink: 0;
}

.member-selector__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-selector__empty {
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
}
</style>
