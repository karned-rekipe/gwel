import assert from 'node:assert/strict'
import test from 'node:test'

import { hasDailyMealContent } from '../src/components/planning/dailyMealVisibility.ts'
import type { MealSlot } from '../src/types/mealPlan.ts'

const emptySlot = (): MealSlot => ({
  date: '2026-11-26',
  slot_code: 'lunch',
  headcount: null,
  headcount_source: null,
  member_ids: [],
  items: [],
})

test('hides a daily meal without content or participants', () => {
  assert.equal(hasDailyMealContent(undefined), false)
  assert.equal(hasDailyMealContent(emptySlot()), false)
})

test('keeps attendance-only meals visible', () => {
  assert.equal(hasDailyMealContent({
    ...emptySlot(),
    member_ids: ['member-a'],
  }), true)

  assert.equal(hasDailyMealContent({
    ...emptySlot(),
    headcount: 2,
  }), true)
})

test('keeps a meal visible when it contains a planned item', () => {
  assert.equal(hasDailyMealContent({
    ...emptySlot(),
    items: [{
      uuid: 'item-a',
      position: 0,
      item_type: 'note',
      member_ids: [],
      recipe_modified: false,
      note: 'Préparer la table',
    }],
  }), true)
})
