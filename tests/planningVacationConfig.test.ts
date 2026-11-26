import assert from 'node:assert/strict'
import test from 'node:test'

import { SCHOOL_ACADEMY_MARKERS, SCHOOL_ZONE_OPTIONS } from '../src/data/schoolZones.ts'
import { reconcileSynchronizedVacationPeriods } from '../src/utils/vacationPeriods.ts'
import type { SchoolVacationPeriod } from '../src/types/householdSchedule.ts'

const period = (
  uuid: string,
  source: SchoolVacationPeriod['source'],
  zone: SchoolVacationPeriod['school_zone'],
  startDate: string,
): SchoolVacationPeriod => ({
  uuid,
  version: 1,
  source,
  school_zone: zone,
  name: uuid,
  start_date: startDate,
  end_date: startDate,
})

test('exposes the unset choice and every official metropolitan school zone', () => {
  assert.deepEqual(SCHOOL_ZONE_OPTIONS.map((option) => option.value), ['', 'A', 'B', 'C'])
  assert.deepEqual(
    ['A', 'B', 'C'].map((zone) => SCHOOL_ACADEMY_MARKERS.filter((academy) => academy.zone === zone).length),
    [8, 11, 5],
  )
})

test('shows synchronized periods immediately while preserving manual and other-zone periods', () => {
  const current = [
    period('manual', 'manual', null, '2026-06-01'),
    period('old-zone-b', 'official', 'B', '2026-02-01'),
    period('zone-a', 'official', 'A', '2026-04-01'),
  ]
  const synchronized = [
    period('new-zone-b-2', 'official', 'B', '2026-10-01'),
    period('new-zone-b-1', 'official', 'B', '2026-08-01'),
  ]

  const result = reconcileSynchronizedVacationPeriods(current, synchronized, 'B')

  assert.deepEqual(result.map((item) => item.uuid), ['zone-a', 'manual', 'new-zone-b-1', 'new-zone-b-2'])
})
