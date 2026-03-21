import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: {
        title: 'Mes Recettes'
      }
    },
    {
      path: '/recipe/:id',
      name: 'recipe-detail',
      component: () => import('../views/RecipeDetailView.vue'),
      meta: {
        title: 'Détail de la recette'
      }
    },
    {
      path: '/add',
      name: 'recipe-add',
      component: () => import('../views/RecipeAddView.vue'),
      meta: {
        title: 'Nouvelle recette'
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/'
    }
  ]
})

// Gestion du titre de page
router.afterEach((to) => {
  const title = (to.meta.title as string) || 'Recipe'
  document.title = `${title} | Recipe`
})

export default router
