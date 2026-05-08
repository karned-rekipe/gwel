<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/atoms/AppButton.vue'
import { useHouseholdMembersStore } from '@/stores/householdMembersStore'
import type { Gender, HouseholdMember, HouseholdMemberPayload, MemberType } from '@/types/householdMember'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const DEFAULT_COLOR = '#4a90d9'
const DEFAULT_COLORS = [DEFAULT_COLOR, '#2f855a', '#d97706', '#7c3aed', '#dc2626', '#0891b2']

const props = defineProps<{
  member?: HouseholdMember | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useHouseholdMembersStore()
const saving = ref(false)
const error = ref<string | null>(null)
const avatarPreview = ref<string | null>(null)
const avatarFileData = ref<string | null>(null)

const form = reactive<HouseholdMemberPayload>({
  name: '',
  member_type: 'resident',
  gender: null,
  birth_year: null,
  color: DEFAULT_COLOR,
})

const title = computed(() => props.member ? 'Modifier une personne' : 'Ajouter une personne')

const resetForm = (): void => {
  form.name = props.member?.name ?? ''
  form.member_type = props.member?.member_type ?? 'resident'
  form.gender = props.member?.gender ?? null
  form.birth_year = props.member?.birth_year ?? null
  form.color = props.member?.color ?? DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)] ?? DEFAULT_COLOR
  avatarPreview.value = props.member?.avatar_data ?? null
  avatarFileData.value = null
  error.value = null
}

watch(() => props.member, resetForm, { immediate: true })

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const onAvatarChange = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > MAX_AVATAR_BYTES) {
    error.value = 'Avatar limité à 2 Mo.'
    input.value = ''
    return
  }
  avatarFileData.value = await toBase64(file)
  avatarPreview.value = avatarFileData.value
}

const submit = async (): Promise<void> => {
  saving.value = true
  error.value = null
  try {
    const payload: HouseholdMemberPayload = {
      name: form.name.trim(),
      member_type: form.member_type as MemberType,
      gender: form.gender as Gender | null,
      birth_year: form.birth_year || null,
      color: form.color,
    }
    const saved = props.member
      ? await store.updateMember(props.member.uuid, payload)
      : await store.createMember(payload)
    if (avatarFileData.value) {
      await store.updateAvatar(saved.uuid, avatarFileData.value)
    }
    emit('saved')
    emit('close')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="member-modal" role="dialog" aria-modal="true" :aria-label="title" @click.self="$emit('close')">
      <form class="member-modal__panel" @submit.prevent="submit">
        <header class="member-modal__header">
          <h2>{{ title }}</h2>
          <button type="button" class="member-modal__close" aria-label="Fermer" @click="$emit('close')">×</button>
        </header>

        <p v-if="error" class="member-modal__error">{{ error }}</p>

        <div class="member-modal__avatar-row">
          <div class="member-modal__avatar" :style="{ backgroundColor: form.color }" aria-hidden="true">
            <img v-if="avatarPreview" :src="avatarPreview" alt="" />
            <span v-else>{{ form.name.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?' }}</span>
          </div>
          <label>
            Avatar
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="onAvatarChange" />
          </label>
        </div>

        <label>
          Nom
          <input v-model="form.name" required minlength="1" maxlength="120" />
        </label>

        <div class="member-modal__grid">
          <label>
            Type
            <select v-model="form.member_type">
              <option value="resident">Membre du foyer</option>
              <option value="recurring_guest">Invité récurrent</option>
            </select>
          </label>
          <label>
            Genre
            <select v-model="form.gender">
              <option :value="null">Non précisé</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </label>
        </div>

        <div class="member-modal__grid">
          <label>
            Année de naissance
            <input v-model.number="form.birth_year" type="number" min="1900" max="2100" />
          </label>
          <label>
            Couleur
            <input v-model="form.color" type="color" />
          </label>
        </div>

        <footer class="member-modal__actions">
          <AppButton type="button" variant="secondary" @click="$emit('close')">Annuler</AppButton>
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</AppButton>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.member-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  overflow: auto;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
}

.member-modal__panel {
  width: min(520px, 100%);
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.member-modal__header,
.member-modal__actions,
.member-modal__avatar-row,
.member-modal__grid {
  display: flex;
  gap: 12px;
}

.member-modal__header,
.member-modal__actions {
  align-items: center;
  justify-content: space-between;
}

.member-modal__header h2 {
  margin: 0;
  font-size: 1.15rem;
}

.member-modal__close {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}

.member-modal__avatar-row {
  align-items: center;
}

.member-modal__avatar {
  width: 64px;
  height: 64px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: white;
  font-size: 1.25rem;
  font-weight: 800;
  flex-shrink: 0;
}

.member-modal__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-modal__grid {
  align-items: start;
}

.member-modal label {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 650;
}

.member-modal input,
.member-modal select {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  padding: 8px 10px;
}

.member-modal input[type='color'] {
  padding: 3px;
}

.member-modal__error {
  margin: 0;
  color: var(--color-danger, #b42318);
  font-weight: 650;
}

@media (max-width: 560px) {
  .member-modal__grid,
  .member-modal__avatar-row {
    flex-direction: column;
  }
}
</style>
