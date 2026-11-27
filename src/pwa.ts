interface ServiceWorkerContainerLike {
  register: (
    scriptURL: string | URL,
    options?: RegistrationOptions,
  ) => Promise<ServiceWorkerRegistration>
}

interface NavigatorWithServiceWorker {
  serviceWorker?: ServiceWorkerContainerLike
}

export const registerRekipeServiceWorker = async (
  navigatorRef: NavigatorWithServiceWorker | null = (
    typeof navigator === 'undefined' ? null : navigator
  ),
): Promise<ServiceWorkerRegistration | null> => {
  if (!navigatorRef?.serviceWorker) return null

  try {
    return await navigatorRef.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (error: unknown) {
    console.warn("Le service worker de Rekipe n’a pas pu être enregistré.", error)
    return null
  }
}

export const scheduleServiceWorkerRegistration = (): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const register = (): void => { void registerRekipeServiceWorker() }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
