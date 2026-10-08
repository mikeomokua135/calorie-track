<script setup>
import {
  RouterLink,
  RouterView,
  useRouter,
  useRoute,
} from 'vue-router'

import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const isAuthPage = computed(() => {
  return route.path === '/login' || route.path === '/register'
})

const logout = async () => {
  const sessionToken = localStorage.getItem('session_token')

  try {
    if (sessionToken) {
      await fetch('http://localhost:3333/logout', {
        method: 'POST',

        headers: {
          'X-Authorization': sessionToken,
        },
      })
    }
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    localStorage.removeItem('session_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('first_name')
    localStorage.removeItem('daily_calorie_goal')

    router.push('/login')
  }
}
</script>

<template>
  <div class="app">
    <header
      v-if="!isAuthPage"
      class="navbar"
    >
      <RouterLink
        to="/"
        class="logo"
      >
        CalorieTrack
      </RouterLink>

      <nav>
        <RouterLink to="/">
          Dashboard
        </RouterLink>

        <RouterLink to="/diary">
          Food Diary
        </RouterLink>

        <RouterLink to="/history">
          History
        </RouterLink>

        <RouterLink to="/exercise">
          Exercise
        </RouterLink>

        <button
          class="logout-button"
          @click="logout"
        >
          Logout
        </button>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.app {
  min-height: 100vh;
  background: #f6f7f9;
  color: #1f2937;
  font-family: Arial, sans-serif;
}

.navbar {
  background: white;
  padding: 20px 7%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  color: #1f2937;
  text-decoration: none;
  font-size: 24px;
  font-weight: bold;
}

.navbar nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.navbar nav a {
  color: #4b5563;
  text-decoration: none;
}

.navbar nav a:hover {
  color: #111827;
}

.navbar nav a.router-link-exact-active {
  color: #111827;
  font-weight: bold;
}

.logout-button {
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  cursor: pointer;
  font-weight: 600;
}

.logout-button:hover {
  background: #e5e7eb;
}

@media (max-width: 750px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .navbar nav {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>