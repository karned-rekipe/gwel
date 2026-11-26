import assert from 'node:assert/strict'
import test from 'node:test'

import { addDaysToIsoDate, isIsoDate, isoDateFromDate } from '../src/utils/localDate.ts'

test('formats a date with local calendar fields', () => {
  assert.equal(isoDateFromDate(new Date(2026, 10, 26, 23, 45)), '2026-11-26')
})

test('moves across month and year boundaries', () => {
  assert.equal(addDaysToIsoDate('2026-11-30', 1), '2026-12-01')
  assert.equal(addDaysToIsoDate('2027-01-01', -1), '2026-12-31')
})

test('accepts only real ISO calendar dates', () => {
  assert.equal(isIsoDate('2026-11-26'), true)
  assert.equal(isIsoDate('2026-02-30'), false)
  assert.equal(isIsoDate('26/11/2026'), false)
  assert.equal(isIsoDate(undefined), false)
})
