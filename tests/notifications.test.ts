import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_NOTIFICATION_DURATION_MS } from '../src/utils/notifications.ts'

test('keeps notifications visible long enough to read without lingering', () => {
  assert.equal(DEFAULT_NOTIFICATION_DURATION_MS, 8000)
})
