import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveMealSlotDefinitions } from '../src/components/planning/mealSlotDefinitions.ts'

test('uses configured meal slots ordered by position', () => {
  const result = resolveMealSlotDefinitions([
    { code: 'dinner', label: 'Dîner', position: 2 },
    { code: 'breakfast', label: 'Petit déjeuner', position: 0 },
  ], [{ slot_code: 'lunch' }])

  assert.deepEqual(result.map((slot) => slot.code), ['breakfast', 'dinner'])
})

test('infers unique meal slots from the calendar when preferences are empty', () => {
  const result = resolveMealSlotDefinitions([], [
    { slot_code: 'snack' },
    { slot_code: 'lunch' },
    { slot_code: 'snack' },
  ], { snack: 'Goûter', lunch: 'Déjeuner' })

  assert.deepEqual(result, [
    { code: 'snack', label: 'Goûter', position: 0 },
    { code: 'lunch', label: 'Déjeuner', position: 1 },
  ])
})

test('falls back to lunch and dinner for an empty calendar', () => {
  assert.deepEqual(resolveMealSlotDefinitions([], []), [
    { code: 'lunch', label: 'Déjeuner', position: 0 },
    { code: 'dinner', label: 'Dîner', position: 1 },
  ])
})
