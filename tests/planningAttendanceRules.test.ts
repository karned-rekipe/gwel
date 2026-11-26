import assert from 'node:assert/strict'
import test from 'node:test'

import { applyMemberSelectionToRules } from '../src/utils/attendanceRules.ts'

test('copies a member selection only to the explicitly targeted meals', () => {
  const current = {
    'even:vacation:monday:lunch': ['aubin'],
    'even:vacation:tuesday:lunch': ['ines'],
    'even:vacation:wednesday:dinner': ['killian'],
  }

  const result = applyMemberSelectionToRules(
    current,
    ['even:vacation:monday:lunch', 'even:vacation:wednesday:dinner'],
    ['aubin', 'karine'],
  )

  assert.deepEqual(result, {
    'even:vacation:monday:lunch': ['aubin', 'karine'],
    'even:vacation:tuesday:lunch': ['ines'],
    'even:vacation:wednesday:dinner': ['aubin', 'karine'],
  })
  assert.deepEqual(current['even:vacation:monday:lunch'], ['aubin'])
})

test('deduplicates repeated targets without sharing member arrays', () => {
  const result = applyMemberSelectionToRules({}, ['one', 'one', 'two'], ['aubin'])

  assert.deepEqual(result, { one: ['aubin'], two: ['aubin'] })
  assert.notEqual(result.one, result.two)
})
