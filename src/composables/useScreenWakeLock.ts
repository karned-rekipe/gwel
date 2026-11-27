import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface WakeLockSentinelLike {
  readonly released: boolean
  addEventListener: (
    type: 'release',
    listener: () => void,
    options?: AddEventListenerOptions,
  ) => void
  release: () => Promise<void>
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

export const isScreenWakeLockSupported = (
  secureContext: boolean,
  navigatorRef: unknown,
): boolean => {
  if (!secureContext || typeof navigatorRef !== 'object' || navigatorRef === null) return false
  const candidate = navigatorRef as NavigatorWithWakeLock
  return typeof candidate.wakeLock?.request === 'function'
}

const wakeLockErrorMessage = (error: unknown): string => {
  const errorName = error instanceof Error ? error.name : ''
  if (errorName === 'NotAllowedError') {
    return "Le navigateur a refusé le maintien de l’écran. Vous pouvez réessayer."
  }
  if (errorName === 'SecurityError') {
    return "Le maintien de l’écran nécessite une connexion HTTPS."
  }
  return "Le maintien de l’écran n’a pas pu être activé. Vous pouvez réessayer."
}

export const useScreenWakeLock = (autoEnable = false) => {
  const navigatorRef = typeof navigator === 'undefined'
    ? null
    : navigator as Navigator & NavigatorWithWakeLock
  const secureContext = typeof window !== 'undefined' && window.isSecureContext
  const isSupported = ref(isScreenWakeLockSupported(secureContext, navigatorRef))
  const isRequested = ref(false)
  const isActive = ref(false)
  const errorMessage = ref<string | null>(null)
  let sentinel: WakeLockSentinelLike | null = null

  const handleRelease = (): void => {
    sentinel = null
    isActive.value = false
  }

  const request = async (): Promise<void> => {
    if (
      !isSupported.value
      || !isRequested.value
      || sentinel
      || typeof document === 'undefined'
      || document.visibilityState !== 'visible'
      || !navigatorRef?.wakeLock
    ) return

    try {
      const acquired = await navigatorRef.wakeLock.request('screen')
      if (!isRequested.value) {
        await acquired.release()
        return
      }
      sentinel = acquired
      isActive.value = true
      errorMessage.value = null
      acquired.addEventListener('release', handleRelease, { once: true })
    } catch (error: unknown) {
      isActive.value = false
      errorMessage.value = wakeLockErrorMessage(error)
    }
  }

  const enable = async (): Promise<void> => {
    isRequested.value = true
    await request()
  }

  const disable = async (): Promise<void> => {
    isRequested.value = false
    errorMessage.value = null
    const current = sentinel
    sentinel = null
    isActive.value = false
    if (current && !current.released) await current.release()
  }

  const toggle = async (): Promise<void> => {
    if (isActive.value) await disable()
    else await enable()
  }

  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && isRequested.value && !isActive.value) {
      void request()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (autoEnable) void enable()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    void disable()
  })

  const status = computed<'unavailable' | 'activating' | 'active' | 'inactive' | 'error'>(() => {
    if (!isSupported.value) return 'unavailable'
    if (isActive.value) return 'active'
    if (errorMessage.value) return 'error'
    if (isRequested.value) return 'activating'
    return 'inactive'
  })

  return {
    errorMessage,
    isActive,
    isRequested,
    isSupported,
    secureContext,
    status,
    disable,
    enable,
    toggle,
  }
}
