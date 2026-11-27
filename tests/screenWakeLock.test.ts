import assert from 'node:assert/strict'
import test from 'node:test'

import { isScreenWakeLockSupported } from '../src/composables/useScreenWakeLock.ts'

test('exposes screen wake lock only in a secure context with the browser API', () => {
  const navigatorWithWakeLock = { wakeLock: { request: async () => ({}) } }

  assert.equal(isScreenWakeLockSupported(true, navigatorWithWakeLock), true)
  assert.equal(isScreenWakeLockSupported(false, navigatorWithWakeLock), false)
  assert.equal(isScreenWakeLockSupported(true, {}), false)
  assert.equal(isScreenWakeLockSupported(true, null), false)
})
