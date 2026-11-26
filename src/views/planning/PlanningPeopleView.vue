<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import HouseholdMemberCard from '@/components/planning/HouseholdMemberCard.vue'
import HouseholdMemberFormModal from '@/components/planning/HouseholdMemberFormModal.vue'
import PlanningSettingsShell from '@/components/planning/PlanningSettingsShell.vue'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import type { HouseholdMember } from '@/types/householdMember'

const membersStore = useHouseholdMembersStore()
const showMemberModal = ref(false)
const editingMember = ref<HouseholdMember | null>(null)
const actionError = ref<string | null>(null)

const openCreateMemberModal = (): void => {
  editingMember.value = null
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

const memberSaved = async (): Promise<void> => {
  await membersStore.fetchMembers()
  closeMemberModal()
}

const removeMember = async (member: HouseholdMember): Promise<void> => {
  if (!window.confirm(`Supprimer ${member.name} ?`)) return
  actionError.value = null
  try {
    await membersStore.removeMember(member.uuid)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Suppression impossible.'
  }
}

onMounted(() => {
  void membersStore.fetchMembers()
})
</script>

<template>
  <PlanningSettingsShell
    eyebrow="Configuration obligatoire"
    title="Personnes"
    description="Le planning repose sur des personnes nommées. Ajoutez les membres du foyer et les invités réguliers qui peuvent participer aux repas."
  >
    <div class="people-page__toolbar">
      <p v-if="membersStore.loading">Chargement…</p>
      <p v-else>{{ membersStore.members.length }} personne{{ membersStore.members.length > 1 ? 's' : '' }}</p>
      <AppButton type="button" @click="openCreateMemberModal">Ajouter une personne</AppButton>
    </div>

    <p v-if="membersStore.error || actionError" class="people-page__error">
      {{ membersStore.error || actionError }}
    </p>

    <section v-if="membersStore.members.length" class="people-page__grid" aria-label="Personnes configurées">
      <HouseholdMemberCard
        v-for="member in membersStore.members"
        :key="member.uuid"
        :member="member"
        @edit="openEditMemberModal"
        @delete="removeMember"
      />
    </section>

    <section v-else-if="!membersStore.loading" class="people-page__empty">
      <span aria-hidden="true">P</span>
      <h2>Aucune personne n’est encore définie</h2>
      <p>Ajoutez une première personne pour déverrouiller le calendrier de planification.</p>
      <AppButton type="button" @click="openCreateMemberModal">Ajouter la première personne</AppButton>
    </section>

    <HouseholdMemberFormModal
      v-if="showMemberModal"
      :member="editingMember"
      @close="closeMemberModal"
      @saved="memberSaved"
    />
  </PlanningSettingsShell>
</template>

<style scoped>
.people-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.people-page__toolbar p {
  margin: 0;
  color: var(--color-text-secondary);
}

.people-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.people-page__empty {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 28px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.people-page__empty > span {
  color: var(--color-primary);
  font-size: 1.1rem;
  font-weight: 850;
}

.people-page__empty h2,
.people-page__empty p {
  margin: 0;
}

.people-page__empty p {
  color: var(--color-text-secondary);
}

.people-page__error {
  margin: 0 0 14px;
  color: var(--color-danger);
}

@media (max-width: 620px) {
  .people-page__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
