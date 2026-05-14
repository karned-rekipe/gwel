import type { HouseholdMember } from '@/types/householdMember'

export const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('fr-FR'))
    .join('') || '?'

export const firstNameFor = (name: string): string => name.trim().split(/\s+/)[0] || name

export const textColorFor = (hex: string): string => {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 145 ? '#111827' : '#ffffff'
}

export const membersForIds = (ids: string[], members: HouseholdMember[]): HouseholdMember[] => {
  const memberById = new Map(members.map((member) => [member.uuid, member]))
  return ids.flatMap((uuid) => {
    const member = memberById.get(uuid)
    return member ? [member] : []
  })
}
