import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/recipes',
    },
    {
      path: '/recipes',
      name: 'recipes-home',
      component: () => import('../views/HomeView.vue'),
      meta: {
        title: 'Recettes',
      },
    },
    {
      path: '/recipes/:id',
      name: 'recipes-detail',
      component: () => import('../views/RecipeDetailView.vue'),
      meta: {
        title: 'Fiche recette',
      },
    },
    {
      path: '/recipes/new',
      name: 'recipes-new',
      component: () => import('../views/RecipeAddView.vue'),
      meta: {
        title: 'Nouvelle recette',
      },
    },
    {
      path: '/planning',
      name: 'planning-home',
      component: () => import('../views/PlanningView.vue'),
      meta: {
        title: 'Planification',
      },
    },
    {
      path: '/shopping',
      name: 'shopping-home',
      component: () => import('../views/ShoppingView.vue'),
      meta: {
        title: 'Courses',
      },
    },
    {
      path: '/recipe/:id',
      redirect: (to) => ({ name: 'recipes-detail', params: { id: to.params.id } }),
    },
    {
      path: '/add',
      redirect: { name: 'recipes-new' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: { name: 'recipes-home' },
    },
  ],
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || 'Rekipe'
  document.title = `${title} | Rekipe`
})

export default router
