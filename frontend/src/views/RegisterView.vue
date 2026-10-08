<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const calorieGoal = ref('')

const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)

const register = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  try {
    const response = await fetch('http://localhost:3333/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        first_name: firstName.value,
        last_name: lastName.value,
        email: email.value,
        password: password.value,
        daily_calorie_goal: Number(calorieGoal.value),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to create account'

      return
    }

    successMessage.value = 'Account created successfully!'

    firstName.value = ''
    lastName.value = ''
    email.value = ''
    password.value = ''
    calorieGoal.value = ''

    setTimeout(() => {
      router.push('/login')
    }, 1000)
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
        <h1>Create your account</h1>

        <p>
          Start tracking your daily calorie intake.
        </p>
      </div>

      <form @submit.prevent="register">
        <div class="name-fields">
          <div class="form-group">
            <label for="firstName">First name</label>

            <input
              id="firstName"
              v-model="firstName"
              type="text"
              placeholder="First name"
              required
            />
          </div>

          <div class="form-group">
            <label for="lastName">Last name</label>

            <input
              id="lastName"
              v-model="lastName"
              type="text"
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email address</label>

          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>

          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Create a password"
            minlength="8"
            required
          />
        </div>

        <div class="form-group">
          <label for="calorieGoal">
            Daily calorie goal
          </label>

          <input
            id="calorieGoal"
            v-model="calorieGoal"
            type="number"
            min="1"
            placeholder="e.g. 2500"
            required
          />
        </div>

        <p
          v-if="errorMessage"
          class="message error-message"
        >
          {{ errorMessage }}
        </p>

        <p
          v-if="successMessage"
          class="message success-message"
        >
          {{ successMessage }}
        </p>

        <button
          type="submit"
          class="primary-button"
          :disabled="loading"
        >
          {{ loading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <p class="switch-page">
        Already have an account?

        <RouterLink to="/login">
          Sign in
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
  max-width: 480px;
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

.name-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
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

.message {
  padding: 11px;
  border-radius: 7px;
  font-size: 14px;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
}

.success-message {
  background: #dcfce7;
  color: #166534;
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

@media (max-width: 500px) {
  .name-fields {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>