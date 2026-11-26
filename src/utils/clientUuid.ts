interface ClientCrypto {
  getRandomValues?: (array: Uint8Array) => Uint8Array
}

const runtimeCrypto = (): ClientCrypto | undefined => (
  typeof globalThis.crypto === 'undefined' ? undefined : globalThis.crypto as unknown as ClientCrypto
)

const uuidFromBytes = (bytes: Uint8Array): string => {
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const createClientUuid = (
  cryptoApi: ClientCrypto | undefined = runtimeCrypto(),
  timestamp = Date.now(),
): string => {
  const bytes = new Uint8Array(16)
  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  const unixMilliseconds = Math.trunc(timestamp)
  bytes[0] = Math.floor(unixMilliseconds / 0x10000000000) & 0xff
  bytes[1] = Math.floor(unixMilliseconds / 0x100000000) & 0xff
  bytes[2] = Math.floor(unixMilliseconds / 0x1000000) & 0xff
  bytes[3] = Math.floor(unixMilliseconds / 0x10000) & 0xff
  bytes[4] = Math.floor(unixMilliseconds / 0x100) & 0xff
  bytes[5] = unixMilliseconds & 0xff
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  return uuidFromBytes(bytes)
}
