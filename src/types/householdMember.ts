export type Gender = 'male' | 'female'
export type MemberType = 'resident' | 'recurring_guest'
export type ScheduleMode = 'headcount' | 'members'

export interface HouseholdMember {
  uuid: string
  version: number
  name: string
  member_type: MemberType
  gender: Gender | null
  birth_year: number | null
  avatar_data: string | null
  color: string
}

export interface HouseholdMemberPayload {
  name: string
  member_type: MemberType
  gender: Gender | null
  birth_year: number | null
  color: string
}
