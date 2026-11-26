import assert from 'node:assert/strict'
import test from 'node:test'

import { ageBandForMember, groupHouseholdMembers } from '../src/utils/householdMemberGroups.ts'
import type { HouseholdMember, MemberType } from '../src/types/householdMember.ts'

const member = (uuid: string, memberType: MemberType, birthYear: number | null): HouseholdMember => ({
  uuid,
  version: 1,
  name: uuid,
  member_type: memberType,
  gender: null,
  birth_year: birthYear,
  avatar_data: null,
  color: '#000000',
})

test('classifies children, teenagers and adults from the configured birth year', () => {
  assert.equal(ageBandForMember(member('child', 'resident', 2016), 2026), 'child')
  assert.equal(ageBandForMember(member('teen', 'resident', 2010), 2026), 'teen')
  assert.equal(ageBandForMember(member('adult', 'resident', 1980), 2026), 'adult')
  assert.equal(ageBandForMember(member('unknown', 'resident', null), 2026), 'unknown')
})

test('separates residents from recurring guests before grouping ages', () => {
  const groups = groupHouseholdMembers([
    member('aubin', 'resident', 2010),
    member('killian', 'resident', 1980),
    member('karine', 'recurring_guest', 1975),
  ], 2026)

  assert.deepEqual(groups.map((group) => ({
    id: group.id,
    ages: group.ageGroups.map((ageGroup) => [ageGroup.id, ageGroup.members.map((item) => item.uuid)]),
  })), [
    { id: 'resident', ages: [['teen', ['aubin']], ['adult', ['killian']]] },
    { id: 'recurring_guest', ages: [['adult', ['karine']]] },
  ])
})
