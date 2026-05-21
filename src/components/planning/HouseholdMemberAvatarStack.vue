<script setup lang="ts">
import { computed } from 'vue'
import { initialsFor, textColorFor } from '@/components/planning/memberDisplay'
import type { HouseholdMember } from '@/types/householdMember'

const props = withDefaults(defineProps<{
  members: HouseholdMember[]
  maxVisible?: number
}>(), {
  maxVisible: 4,
})

const visibleMembers = computed(() => props.members.slice(0, props.maxVisible))
const hiddenCount = computed(() => Math.max(props.members.length - visibleMembers.value.length, 0))
</script>

<template>
  <span v-if="visibleMembers.length" class="member-avatar-stack" aria-hidden="true">
    <span
      v-for="member in visibleMembers"
      :key="member.uuid"
      class="member-avatar-stack__avatar"
      :style="{ backgroundColor: member.color, color: textColorFor(member.color) }"
      :title="member.name"
    >
      <img v-if="member.avatar_data" :src="member.avatar_data" :alt="member.name" />
      <span v-else>{{ initialsFor(member.name) }}</span>
    </span>
    <strong v-if="hiddenCount" class="member-avatar-stack__more">+{{ hiddenCount }}</strong>
  </span>
</template>

<style scoped>
.member-avatar-stack {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  padding-left: 6px;
}

.member-avatar-stack__avatar,
.member-avatar-stack__more {
  width: 18px;
  height: 18px;
  overflow: hidden;
  display: inline-grid;
  place-items: center;
  margin-left: -6px;
  border: 1px solid var(--color-surface);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  font-size: 0.56rem;
  font-weight: 800;
  line-height: 1;
}

.member-avatar-stack__avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.member-avatar-stack__more {
  width: auto;
  min-width: 21px;
  padding: 0 5px;
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface));
  color: var(--color-primary);
}
</style>
