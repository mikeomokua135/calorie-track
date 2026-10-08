<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

const login = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    const response = await fetch('http://localhost:3333/login', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to login'

      return
    }

    localStorage.setItem(
      'session_token',
      data.session_token,
    )

    localStorage.setItem(
      'user_id',
      data.user_id,
    )

    localStorage.setItem(
      'first_name',
      data.first_name,
    )

    localStorage.setItem(
      'daily_calorie_goal',
      data.daily_calorie_goal,
    )

    router.push('/')
  } catch (error) {
    console.error(error)

    errorMessage.value =
      'Unable to connect to the server. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="heading">
        <h1>Welcome back</h1>

        <p>
          Sign in to continue tracking your calories.
        </p>
      </div>

      <form @submit.prevent="login">
        <div class="form-group">
          <label for="email">
            Email address
          </label>

          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">
            Password
          </label>

          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
          />
        </div>

        <p
          v-if="errorMessage"
          class="error-message"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="primary-button"
          :disabled="loading"
        >
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <p class="switch-page">
        Don't have an account?

        <RouterLink to="/register">
          Create account
        </RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 85px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.auth-card {
  width: 100%;
  max-width: 430px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
}

.heading {
  margin-bottom: 25px;
}

.heading h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

.heading p {
  margin: 0;
  color: #6b7280;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 11px;
  border-radius: 7px;
  font-size: 14px;
}

.primary-button {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 13px;
  background: #1f2937;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-page {
  text-align: center;
  margin: 22px 0 0;
  color: #6b7280;
}

.switch-page a {
  color: #1f2937;
  font-weight: 600;
}
</style>