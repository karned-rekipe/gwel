<script setup lang="ts">
import { computed } from 'vue'
import { firstNameFor, initialsFor, textColorFor } from '@/components/planning/memberDisplay'
import type { HouseholdMember } from '@/types/householdMember'
import { groupHouseholdMembers } from '@/utils/householdMemberGroups'

const props = defineProps<{
  members: HouseholdMember[]
  emptyLabel?: string
}>()

const groups = computed(() => groupHouseholdMembers(props.members))
</script>

<template>
  <div v-if="groups.length" class="member-pill-list">
    <section v-for="group in groups" :key="group.id" class="member-pill-list__type">
      <header>
        <strong>{{ group.label }}</strong>
        <span>{{ group.count }}</span>
      </header>
      <div class="member-pill-list__ages">
        <div v-for="ageGroup in group.ageGroups" :key="ageGroup.id" class="member-pill-list__age">
          <span class="member-pill-list__age-label">{{ ageGroup.label }}</span>
          <div class="member-pill-list__pills">
            <span
              v-for="member in ageGroup.members"
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
          </div>
        </div>
      </div>
    </section>
  </div>
  <span v-else class="member-pill-list__empty">{{ emptyLabel ?? 'Aucune personne' }}</span>
</template>

<style scoped>
.member-pill-list {
  min-width: 0;
  display: grid;
  gap: 12px;
}

.member-pill-list__type {
  min-width: 0;
  display: grid;
  gap: 7px;
}

.member-pill-list__type > header {
  display: flex;
  align-items: center;
  gap: 7px;
}

.member-pill-list__type > header strong,
.member-pill-list__age-label {
  color: var(--color-text-secondary);
  font-size: 0.67rem;
  font-weight: 780;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.member-pill-list__type > header > span {
  min-width: 20px;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  color: var(--color-text-tertiary);
  font-size: 0.67rem;
  font-weight: 750;
  text-align: center;
}

.member-pill-list__ages {
  display: grid;
  gap: 7px;
  padding-left: 6px;
  border-left: 2px solid var(--color-border);
}

.member-pill-list__age {
  min-width: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.member-pill-list__pills {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
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

@media (max-width: 520px) {
  .member-pill-list__age {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
