import assert from 'node:assert/strict'
import test from 'node:test'

import { createClientUuid } from '../src/utils/clientUuid.ts'

test('uses the native random UUID implementation when it is available', () => {
  assert.equal(createClientUuid({ randomUUID: () => 'native-uuid' }), 'native-uuid')
})

test('builds an RFC 4122 version 4 UUID when randomUUID is unavailable', () => {
  const uuid = createClientUuid({
    getRandomValues: (bytes) => {
      bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      return bytes
    },
  })

  assert.equal(uuid, '00010203-0405-4607-8809-0a0b0c0d0e0f')
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('keeps generating valid UUIDs without any Web Crypto implementation', () => {
  assert.match(
    createClientUuid({}),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
})
