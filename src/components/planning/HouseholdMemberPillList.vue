<script setup lang="ts">
import { firstNameFor, initialsFor, textColorFor } from '@/components/planning/memberDisplay'
import type { HouseholdMember } from '@/types/householdMember'

defineProps<{
  members: HouseholdMember[]
  emptyLabel?: string
}>()
</script>

<template>
  <div class="member-pill-list">
    <span
      v-for="member in members"
      :key="member.uuid"
      class="member-pill-list__pill"
      :style="{ backgroundColor: member.color, color: textColorFor(member.color) }"
      :title="member.name"
    >
      <span class="member-pill-list__avatar" :style="{ backgroundColor: member.color }">
        <img v-if="member.avatar_data" :src="member.avatar_data" :alt="member.name" />
        <span v-else>{{ initialsFor(member.name) }}</span>
      </span>
      <span>{{ firstNameFor(member.name) }}</span>
    </span>
    <span v-if="!members.length" class="member-pill-list__empty">{{ emptyLabel ?? 'Aucune personne' }}</span>
  </div>
</template>

<style scoped>
.member-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.member-pill-list__pill {
  min-width: 0;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px 4px 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
}

.member-pill-list__avatar {
  width: 22px;
  height: 22px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-surface) 76%, transparent);
  border-radius: var(--radius-full);
  color: white;
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
}

.member-pill-list__avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.member-pill-list__empty {
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
}
</style>
