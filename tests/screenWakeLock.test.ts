import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { isScreenWakeLockSupported } from '../src/composables/useScreenWakeLock.ts'

test('exposes screen wake lock only in a secure context with the browser API', () => {
  const navigatorWithWakeLock = { wakeLock: { request: async () => ({}) } }

  assert.equal(isScreenWakeLockSupported(true, navigatorWithWakeLock), true)
  assert.equal(isScreenWakeLockSupported(false, navigatorWithWakeLock), false)
  assert.equal(isScreenWakeLockSupported(true, {}), false)
  assert.equal(isScreenWakeLockSupported(true, null), false)
})

test('places the wake lock pictogram in the preparation title bar', async () => {
  const [shell, layer, detail] = await Promise.all([
    readFile(new URL('../src/components/resources/ResourceLayerShell.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/planning/MealPreparationLayer.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/planning/MealPreparationDetail.vue', import.meta.url), 'utf8'),
  ])

  assert.match(shell, /<slot name="header-actions"/)
  assert.match(layer, /<template #header-actions>/)
  assert.match(layer, /class="meal-preparation-layer__wake-lock"/)
  assert.match(layer, /aria-label="wakeLockLabel"/)
  assert.doesNotMatch(detail, /meal-preparation__wake-lock/)
})
