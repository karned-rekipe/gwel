import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assignedServingsFor,
  remainingTimerSeconds,
  ringingTimerSeconds,
  scaleIngredientQuantity,
  timerProgressPercent,
} from '../src/utils/recipePreparation.ts'

test('scales ingredient quantities from recipe servings to assigned servings', () => {
  assert.equal(scaleIngredientQuantity(100, 4, 6), 150)
  assert.equal(scaleIngredientQuantity(0.5, 4, 6), 0.75)
})

test('uses named participants as the initial target even when a manual headcount differs', () => {
  assert.equal(assignedServingsFor(5, 3, 4, 6), 3)
  assert.equal(assignedServingsFor(5, 0, 4, 6), 5)
})

test('derives a running countdown from its persisted start time', () => {
  const now = Date.parse('2026-11-26T18:00:45.000Z')
  assert.equal(remainingTimerSeconds({
    timer_id: 'step:1:cooking',
    duration_seconds: 180,
    remaining_seconds: 180,
    status: 'running',
    started_at: '2026-11-26T18:00:00.000Z',
  }, now), 135)
})

test('derives how long an expired timer has been ringing', () => {
  const now = Date.parse('2026-11-26T18:04:05.000Z')
  assert.equal(ringingTimerSeconds({
    timer_id: 'step:1:cooking',
    duration_seconds: 180,
    remaining_seconds: 0,
    status: 'ringing',
    ringing_since: '2026-11-26T18:03:00.000Z',
  }, now), 65)
})

test('does not expose a ringing duration for another timer state or a future timestamp', () => {
  const now = Date.parse('2026-11-26T18:04:05.000Z')
  assert.equal(ringingTimerSeconds({
    timer_id: 'step:1:cooking',
    duration_seconds: 180,
    remaining_seconds: 45,
    status: 'paused',
    ringing_since: '2026-11-26T18:03:00.000Z',
  }, now), 0)
  assert.equal(ringingTimerSeconds({
    timer_id: 'step:1:cooking',
    duration_seconds: 180,
    remaining_seconds: 0,
    status: 'ringing',
    ringing_since: '2026-11-26T18:05:00.000Z',
  }, now), 0)
})

test('calculates a bounded progress percentage for the compact timer track', () => {
  assert.equal(timerProgressPercent(300, 300), 0)
  assert.equal(timerProgressPercent(300, 90), 70)
  assert.equal(timerProgressPercent(300, 0), 100)
  assert.equal(timerProgressPercent(300, -10), 100)
  assert.equal(timerProgressPercent(0, 0), 0)
})
