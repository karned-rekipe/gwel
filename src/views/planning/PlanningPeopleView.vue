<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import HouseholdMemberCard from '@/components/planning/HouseholdMemberCard.vue'
import HouseholdMemberFormModal from '@/components/planning/HouseholdMemberFormModal.vue'
import PlanningSettingsShell from '@/components/planning/PlanningSettingsShell.vue'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import type { HouseholdMember, MemberType } from '@/types/householdMember'

const membersStore = useHouseholdMembersStore()
const showMemberModal = ref(false)
const editingMember = ref<HouseholdMember | null>(null)
const creatingMemberType = ref<MemberType>('resident')
const residents = computed(() => membersStore.members.filter((member) => member.member_type === 'resident'))
const recurringGuests = computed(() => membersStore.members.filter((member) => member.member_type === 'recurring_guest'))

const openCreateMemberModal = (memberType: MemberType): void => {
  editingMember.value = null
  creatingMemberType.value = memberType
  showMemberModal.value = true
}

const openEditMemberModal = (member: HouseholdMember): void => {
  editingMember.value = member
  showMemberModal.value = true
}

const closeMemberModal = (): void => {
  showMemberModal.value = false
  editingMember.value = null
}

const memberSaved = (): void => {
  closeMemberModal()
}

onMounted(() => {
  void membersStore.fetchMembers()
})
</script>

<template>
  <PlanningSettingsShell title="Personnes">
    <p v-if="membersStore.loading" class="people-page__loading">Chargement…</p>

    <p v-if="membersStore.error" class="people-page__error">
      {{ membersStore.error }}
    </p>

    <div v-if="!membersStore.loading" class="people-page__groups">
      <section class="people-page__group" aria-labelledby="residents-title">
        <header class="people-page__group-header">
          <h2 id="residents-title">Membres du foyer</h2>
          <span>{{ residents.length }}</span>
        </header>
        <div v-if="residents.length" class="people-page__grid">
          <HouseholdMemberCard
            v-for="member in residents"
            :key="member.uuid"
            :member="member"
            @edit="openEditMemberModal"
          />
        </div>
        <p v-else class="people-page__group-empty">Aucun membre du foyer.</p>
        <div class="people-page__group-action">
          <AppButton type="button" variant="secondary" @click="openCreateMemberModal('resident')">
            Ajouter une personne au foyer
          </AppButton>
        </div>
      </section>

      <section class="people-page__group" aria-labelledby="guests-title">
        <header class="people-page__group-header">
          <h2 id="guests-title">Invités réguliers</h2>
          <span>{{ recurringGuests.length }}</span>
        </header>
        <div v-if="recurringGuests.length" class="people-page__grid">
          <HouseholdMemberCard
            v-for="member in recurringGuests"
            :key="member.uuid"
            :member="member"
            @edit="openEditMemberModal"
          />
        </div>
        <p v-else class="people-page__group-empty">Aucun invité régulier.</p>
        <div class="people-page__group-action">
          <AppButton type="button" variant="secondary" @click="openCreateMemberModal('recurring_guest')">
            Ajouter un invité régulier
          </AppButton>
        </div>
      </section>
    </div>

    <HouseholdMemberFormModal
      v-if="showMemberModal"
      :member="editingMember"
      :default-member-type="creatingMemberType"
      @close="closeMemberModal"
      @saved="memberSaved"
    />
  </PlanningSettingsShell>
</template>

<style scoped>
.people-page__loading {
  margin: 0;
  color: var(--color-text-secondary);
}

.people-page__groups,
.people-page__group {
  display: grid;
  gap: 14px;
}

.people-page__groups {
  gap: 24px;
}

.people-page__group-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.people-page__group-header h2 {
  margin: 0;
  font-size: 1rem;
}

.people-page__group-header span {
  min-width: 28px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 750;
  text-align: center;
}

.people-page__group-empty {
  margin: 0;
  padding: 16px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}

.people-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}

.people-page__group-action {
  display: flex;
  justify-content: flex-end;
}

.people-page__error {
  margin: 0 0 14px;
  color: var(--color-danger);
}

@media (max-width: 520px) {
  .people-page__grid {
    grid-template-columns: 1fr;
  }

  .people-page__group-action :deep(button) {
    width: 100%;
  }
}
</style>
