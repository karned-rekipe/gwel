import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { scheduleServiceWorkerRegistration } from './pwa'
import { initializeAuth } from './services/auth'

// Configuration de Vue Query
const vueQueryOptions: VueQueryPluginOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
        gcTime: 10 * 60 * 1000, // 10 minutes - durée de cache (anciennement cacheTime)
        refetchOnWindowFocus: true, // Rafraîchir au focus de la fenêtre
        retry: 1 // 1 seule tentative en cas d'échec
      },
      mutations: {
        retry: 0 // Pas de retry pour les mutations
      }
    }
  }
}

const bootstrap = async (): Promise<void> => {
  await initializeAuth()

  const app = createApp(App)
  app.use(createPinia())
  app.use(VueQueryPlugin, vueQueryOptions)
  app.use(router)
  app.mount('#app')

  if (import.meta.env.PROD) scheduleServiceWorkerRegistration()
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Impossible d'initialiser l'application"
  const root = document.querySelector<HTMLDivElement>('#app')
  if (root) {
    root.textContent = message
  }
})
