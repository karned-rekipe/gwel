const TRANSACTION_KEY_PREFIX = 'rekipe.oidc_transaction.'
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000

export type OidcTransaction = {
  state: string
  verifier: string
  redirectUri: string
  createdAt: number
}

type TransactionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

type TransactionStoragePair = {
  session: TransactionStorage
  persistent: TransactionStorage
}

const transactionKey = (state: string): string => `${TRANSACTION_KEY_PREFIX}${state}`

const removeSafely = (storage: TransactionStorage, key: string): void => {
  try {
    storage.removeItem(key)
  } catch {
    // A storage backend can become unavailable between two navigations.
  }
}

const readSafely = (storage: TransactionStorage, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const isValidTransaction = (
  value: unknown,
  expectedState: string,
  expectedOrigin: string,
  now: number,
  maxAgeMs: number,
): value is OidcTransaction => {
  if (!value || typeof value !== 'object') return false

  const transaction = value as Partial<OidcTransaction>
  if (
    transaction.state !== expectedState
    || typeof transaction.verifier !== 'string'
    || !/^[A-Za-z0-9._~-]{43,128}$/.test(transaction.verifier)
    || typeof transaction.redirectUri !== 'string'
    || typeof transaction.createdAt !== 'number'
    || !Number.isFinite(transaction.createdAt)
    || transaction.createdAt > now
    || now - transaction.createdAt > maxAgeMs
  ) {
    return false
  }

  try {
    return new URL(transaction.redirectUri).origin === expectedOrigin
  } catch {
    return false
  }
}

const parseTransaction = (
  serialized: string | null,
  expectedState: string,
  expectedOrigin: string,
  now: number,
  maxAgeMs: number,
): OidcTransaction | null => {
  if (!serialized) return null

  try {
    const value: unknown = JSON.parse(serialized)
    return isValidTransaction(value, expectedState, expectedOrigin, now, maxAgeMs) ? value : null
  } catch {
    return null
  }
}

export const storeOidcTransaction = (
  storages: TransactionStoragePair,
  transaction: OidcTransaction,
): void => {
  const key = transactionKey(transaction.state)
  const serialized = JSON.stringify(transaction)
  let stored = false

  for (const storage of [storages.session, storages.persistent]) {
    try {
      storage.setItem(key, serialized)
      stored = true
    } catch {
      // Keep the other first-party storage as a bounded fallback.
    }
  }

  if (!stored) {
    throw new Error("Le navigateur n'a pas pu enregistrer la transaction d'authentification")
  }
}

export const readOidcTransaction = (
  storages: TransactionStoragePair,
  state: string,
  expectedOrigin: string,
  now = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): OidcTransaction | null => {
  const key = transactionKey(state)

  for (const storage of [storages.session, storages.persistent]) {
    const transaction = parseTransaction(
      readSafely(storage, key),
      state,
      expectedOrigin,
      now,
      maxAgeMs,
    )
    if (transaction) return transaction
  }

  return null
}

export const removeOidcTransaction = (
  storages: TransactionStoragePair,
  state: string,
): void => {
  const key = transactionKey(state)
  removeSafely(storages.session, key)
  removeSafely(storages.persistent, key)
}

export const pruneOidcTransactions = (
  storages: TransactionStoragePair,
  expectedOrigin: string,
  now = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): void => {
  for (const storage of [storages.session, storages.persistent]) {
    const keys: string[] = []

    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key?.startsWith(TRANSACTION_KEY_PREFIX)) keys.push(key)
      }
    } catch {
      continue
    }

    for (const key of keys) {
      const state = key.slice(TRANSACTION_KEY_PREFIX.length)
      const transaction = parseTransaction(
        readSafely(storage, key),
        state,
        expectedOrigin,
        now,
        maxAgeMs,
      )
      if (!transaction) removeSafely(storage, key)
    }
  }
}
