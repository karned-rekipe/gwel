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
      path: '/recipes/:id/edit',
      name: 'recipes-edit',
      component: () => import('../views/RecipeEditView.vue'),
      meta: {
        title: 'Modifier la recette',
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
      path: '/ingredients',
      name: 'ingredients-home',
      component: () => import('../views/IngredientListView.vue'),
      meta: {
        title: 'Ingrédients',
      },
    },
    {
      path: '/ingredients/:id',
      name: 'ingredients-detail',
      component: () => import('../views/IngredientDetailView.vue'),
      meta: {
        title: 'Fiche ingrédient',
      },
    },
    {
      path: '/equipment',
      name: 'equipment-home',
      component: () => import('../views/EquipmentListView.vue'),
      meta: {
        title: 'Équipements',
      },
    },
    {
      path: '/equipment/:id',
      name: 'equipment-detail',
      component: () => import('../views/EquipmentDetailView.vue'),
      meta: {
        title: 'Fiche équipement',
      },
    },
    {
      path: '/tags',
      name: 'tags-home',
      component: () => import('../views/TagListView.vue'),
      meta: {
        title: 'Tags',
      },
    },
    {
      path: '/tags/:id',
      name: 'tags-detail',
      component: () => import('../views/TagDetailView.vue'),
      meta: {
        title: 'Fiche tag',
      },
    },
    {
      path: '/settings/ingredients',
      name: 'ingredient-settings',
      component: () => import('../views/IngredientSettingsView.vue'),
      meta: {
        title: 'Réglages ingrédients',
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
