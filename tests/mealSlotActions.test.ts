import assert from 'node:assert/strict'
import test from 'node:test'

import { mealSlotActions } from '../src/components/planning/mealSlotActions.ts'

test('keeps every existing meal content action available', () => {
  assert.deepEqual(
    mealSlotActions.filter((action) => !action.disabled).map((action) => action.mode),
    ['recipe', 'wishlist', 'ingredient', 'note'],
  )
})

test('exposes the unavailable AI action as disabled', () => {
  const aiAction = mealSlotActions.find((action) => action.id === 'ai')

  assert.ok(aiAction)
  assert.equal(aiAction.disabled, true)
  assert.equal(aiAction.mode, null)
  assert.match(aiAction.unavailableLabel ?? '', /bientôt disponible/i)
})
