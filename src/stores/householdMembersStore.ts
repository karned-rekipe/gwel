import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { householdMemberService } from '@/services/householdMemberService'
import type { HouseholdMember, HouseholdMemberPayload } from '@/types/householdMember'

export const useHouseholdMembersStore = defineStore('householdMembers', () => {
  const members = ref<HouseholdMember[]>([])
  const etags = reactive<Record<string, string>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  const upsertMember = (member: HouseholdMember): void => {
    const next = members.value.filter((item) => item.uuid !== member.uuid)
    next.push(member)
    next.sort((a, b) => {
      if (a.member_type !== b.member_type) return a.member_type === 'resident' ? -1 : 1
      return a.name.localeCompare(b.name, 'fr')
    })
    members.value = next
  }

  async function fetchMembers(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      members.value = await householdMemberService.list()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Chargement des personnes impossible.'
    } finally {
      loading.value = false
    }
  }

  async function createMember(payload: HouseholdMemberPayload): Promise<HouseholdMember> {
    const response = await householdMemberService.create(payload)
    upsertMember(response.payload)
    etags[response.payload.uuid] = response.etag
    return response.payload
  }

  async function updateMember(uuid: string, payload: HouseholdMemberPayload): Promise<HouseholdMember> {
    const etag = etags[uuid] || `W/"${members.value.find((member) => member.uuid === uuid)?.version ?? 1}"`
    const response = await householdMemberService.update(uuid, etag, payload)
    upsertMember(response.payload)
    etags[uuid] = response.etag
    return response.payload
  }

  async function updateAvatar(uuid: string, avatarData: string): Promise<HouseholdMember> {
    const etag = etags[uuid] || `W/"${members.value.find((member) => member.uuid === uuid)?.version ?? 1}"`
    const response = await householdMemberService.updateAvatar(uuid, etag, avatarData)
    upsertMember(response.payload)
    etags[uuid] = response.etag
    return response.payload
  }

  async function removeMember(uuid: string): Promise<void> {
    const etag = etags[uuid] || `W/"${members.value.find((member) => member.uuid === uuid)?.version ?? 1}"`
    await householdMemberService.remove(uuid, etag)
    members.value = members.value.filter((member) => member.uuid !== uuid)
    delete etags[uuid]
  }

  return {
    members,
    etags,
    loading,
    error,
    fetchMembers,
    createMember,
    updateMember,
    updateAvatar,
    removeMember,
  }
})
