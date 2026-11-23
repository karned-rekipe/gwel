import assert from 'node:assert/strict'
import test from 'node:test'

import {
  pruneOidcTransactions,
  readOidcTransaction,
  removeOidcTransaction,
  storeOidcTransaction,
  type OidcTransaction,
} from '../src/services/oidcTransaction.ts'

class MemoryStorage {
  private values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class UnavailableStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('storage unavailable')
  }

  override setItem(): void {
    throw new Error('storage unavailable')
  }
}

const now = Date.parse('2026-11-23T15:00:00Z')
const origin = 'https://rekipe.amazone.lan'
const transaction: OidcTransaction = {
  state: 'state-one',
  verifier: 'a'.repeat(64),
  redirectUri: `${origin}/recipes/one`,
  createdAt: now,
}

const createStorages = () => ({
  session: new MemoryStorage(),
  persistent: new MemoryStorage(),
})

test('stores and reads a transaction from the tab storage', () => {
  const storages = createStorages()
  storeOidcTransaction(storages, transaction)

  assert.deepEqual(readOidcTransaction(storages, transaction.state, origin, now), transaction)
})

test('falls back to the origin storage when the callback opens in another tab', () => {
  const originalStorages = createStorages()
  storeOidcTransaction(originalStorages, transaction)

  const callbackStorages = {
    session: new MemoryStorage(),
    persistent: originalStorages.persistent,
  }

  assert.deepEqual(
    readOidcTransaction(callbackStorages, transaction.state, origin, now),
    transaction,
  )
})

test('continues when the tab storage is unavailable', () => {
  const persistent = new MemoryStorage()
  const storages = {
    session: new UnavailableStorage(),
    persistent,
  }

  storeOidcTransaction(storages, transaction)

  assert.deepEqual(readOidcTransaction(storages, transaction.state, origin, now), transaction)
})

test('rejects expired, foreign-origin and malformed transactions', () => {
  const expiredStorages = createStorages()
  storeOidcTransaction(expiredStorages, transaction)
  assert.equal(
    readOidcTransaction(expiredStorages, transaction.state, origin, now + 10 * 60 * 1000 + 1),
    null,
  )

  const foreignOriginStorages = createStorages()
  storeOidcTransaction(foreignOriginStorages, {
    ...transaction,
    redirectUri: 'https://attacker.example/callback',
  })
  assert.equal(readOidcTransaction(foreignOriginStorages, transaction.state, origin, now), null)

  const malformedStorages = createStorages()
  storeOidcTransaction(malformedStorages, { ...transaction, verifier: 'too-short' })
  assert.equal(readOidcTransaction(malformedStorages, transaction.state, origin, now), null)
})

test('keeps concurrent transactions isolated by state and consumes only one', () => {
  const storages = createStorages()
  const secondTransaction = { ...transaction, state: 'state-two' }
  storeOidcTransaction(storages, transaction)
  storeOidcTransaction(storages, secondTransaction)

  removeOidcTransaction(storages, transaction.state)

  assert.equal(readOidcTransaction(storages, transaction.state, origin, now), null)
  assert.deepEqual(
    readOidcTransaction(storages, secondTransaction.state, origin, now),
    secondTransaction,
  )
})

test('prunes invalid and expired transactions without deleting a valid one', () => {
  const storages = createStorages()
  const validTransaction = { ...transaction, state: 'state-valid' }
  const expiredTransaction = {
    ...transaction,
    state: 'state-expired',
    createdAt: now - 10 * 60 * 1000 - 1,
  }
  storeOidcTransaction(storages, validTransaction)
  storeOidcTransaction(storages, expiredTransaction)

  pruneOidcTransactions(storages, origin, now)

  assert.deepEqual(
    readOidcTransaction(storages, validTransaction.state, origin, now),
    validTransaction,
  )
  assert.equal(readOidcTransaction(storages, expiredTransaction.state, origin, now), null)
})
