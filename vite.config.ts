import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/recipe': {
          target: env.VITE_RECIPE_PROXY_TARGET || 'http://127.0.0.1:8301',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/recipe/, ''),
        },
        '/api/recipe-agent': {
          target: env.VITE_RECIPE_AGENT_PROXY_TARGET || 'http://127.0.0.1:8303',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/recipe-agent/, ''),
        },
        '/api/meal-planner': {
          target: env.VITE_MEAL_PLANNER_PROXY_TARGET || 'http://127.0.0.1:8010',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/meal-planner/, ''),
        },
        '/api/meal-planner-agent': {
          target: env.VITE_MEAL_PLANNER_AGENT_PROXY_TARGET || 'http://127.0.0.1:8016',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/meal-planner-agent/, ''),
        },
        '/api/shopping': {
          target: env.VITE_SHOPPING_PROXY_TARGET || 'http://127.0.0.1:8020',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/shopping/, ''),
        },
        '/api/shopping-agent': {
          target: env.VITE_SHOPPING_AGENT_PROXY_TARGET || 'http://127.0.0.1:8026',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/shopping-agent/, ''),
        },
      },
    },
  }
})
