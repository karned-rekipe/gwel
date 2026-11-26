import assert from 'node:assert/strict'
import test from 'node:test'

import { createClientUuid } from '../src/utils/clientUuid.ts'

test('builds an RFC 9562 version 7 UUID from its timestamp and random data', () => {
  const uuid = createClientUuid({
    getRandomValues: (bytes) => {
      bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      return bytes
    },
  }, 0x0123456789ab)

  assert.equal(uuid, '01234567-89ab-7607-8809-0a0b0c0d0e0f')
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('orders UUIDs by their millisecond timestamp', () => {
  const cryptoApi = {
    getRandomValues: (bytes: Uint8Array) => bytes.fill(0),
  }

  const earlier = createClientUuid(cryptoApi, 1_796_000_000_000)
  const later = createClientUuid(cryptoApi, 1_796_000_000_001)

  assert.ok(earlier < later)
})

test('keeps generating valid version 7 UUIDs without any Web Crypto implementation', () => {
  assert.match(
    createClientUuid({}, 1_796_000_000_000),
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
})
