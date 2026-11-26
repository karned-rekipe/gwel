import type { HouseholdMember, MemberType } from '@/types/householdMember'

export type MemberAgeBand = 'child' | 'teen' | 'adult' | 'unknown'

export interface MemberAgeGroup {
  id: MemberAgeBand
  label: string
  members: HouseholdMember[]
}

export interface MemberTypeGroup {
  id: MemberType
  label: string
  ageGroups: MemberAgeGroup[]
  count: number
}

const AGE_GROUPS: Array<{ id: MemberAgeBand; label: string }> = [
  { id: 'child', label: 'Enfants' },
  { id: 'teen', label: 'Ados' },
  { id: 'adult', label: 'Adultes' },
  { id: 'unknown', label: 'Âge non renseigné' },
]

export const ageBandForMember = (member: HouseholdMember, referenceYear = new Date().getFullYear()): MemberAgeBand => {
  if (!member.birth_year) return 'unknown'
  const age = referenceYear - member.birth_year
  if (age < 13) return 'child'
  if (age < 18) return 'teen'
  return 'adult'
}

export const groupHouseholdMembers = (
  members: HouseholdMember[],
  referenceYear = new Date().getFullYear(),
): MemberTypeGroup[] => ([
  { id: 'resident' as const, label: 'Membres du foyer' },
  { id: 'recurring_guest' as const, label: 'Invités réguliers' },
].flatMap((type) => {
  const typeMembers = members.filter((member) => member.member_type === type.id)
  if (!typeMembers.length) return []
  return [{
    ...type,
    count: typeMembers.length,
    ageGroups: AGE_GROUPS.flatMap((ageGroup) => {
      const ageMembers = typeMembers.filter((member) => ageBandForMember(member, referenceYear) === ageGroup.id)
      return ageMembers.length ? [{ ...ageGroup, members: ageMembers }] : []
    }),
  }]
}))
