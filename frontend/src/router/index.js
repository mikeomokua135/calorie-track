import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import FoodDiaryView from '../views/FoodDiaryView.vue'
import HistoryView from '../views/HistoryView.vue'
import ExerciseView from '../views/ExerciseView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      path: '/diary',
      name: 'diary',
      component: FoodDiaryView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/exercise',
      name: 'exercise',
      component: ExerciseView,
      meta: {
        requiresAuth: true,
      },
    },
  ],
})

router.beforeEach((to) => {
  const sessionToken = localStorage.getItem('session_token')

  if (to.meta.requiresAuth && !sessionToken) {
    return '/login'
  }

  if (
    (to.path === '/login' || to.path === '/register') &&
    sessionToken
  ) {
    return '/'
  }
})

export default router