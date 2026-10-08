<script setup>
import { ref, computed, onMounted } from 'vue'

const activityName = ref('')
const duration = ref('')
const caloriesBurned = ref('')

const activities = ref([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const getSessionToken = () => {
  return localStorage.getItem('session_token')
}

const today = () => {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const totalCaloriesBurned = computed(() => {
  return activities.value.reduce(
    (total, activity) =>
      total + Number(activity.calories_burned),
    0,
  )
})

const totalDuration = computed(() => {
  return activities.value.reduce(
    (total, activity) =>
      total + Number(activity.duration),
    0,
  )
})

const loadExercise = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      `http://localhost:3333/exercise?date=${today()}`,
      {
        headers: {
          'X-Authorization': getSessionToken(),
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to load exercise entries'
      return
    }

    activities.value = data
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Unable to connect to the server.'
  } finally {
    loading.value = false
  }
}

const addActivity = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (
    !activityName.value.trim() ||
    Number(duration.value) <= 0 ||
    Number(caloriesBurned.value) <= 0
  ) {
    errorMessage.value =
      'Please enter valid exercise information.'
    return
  }

  saving.value = true

  try {
    const response = await fetch(
      'http://localhost:3333/exercise',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': getSessionToken(),
        },

        body: JSON.stringify({
          activity_name: activityName.value.trim(),
          duration: Number(duration.value),
          calories_burned: Number(caloriesBurned.value),
          entry_date: today(),
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to add exercise'
      return
    }

    activityName.value = ''
    duration.value = ''
    caloriesBurned.value = ''

    successMessage.value = 'Exercise added successfully.'

    await loadExercise()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Unable to connect to the server.'
  } finally {
    saving.value = false
  }
}

const deleteActivity = async (exerciseId) => {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await fetch(
      `http://localhost:3333/exercise/${exerciseId}`,
      {
        method: 'DELETE',

        headers: {
          'X-Authorization': getSessionToken(),
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to delete exercise'
      return
    }

    successMessage.value = 'Exercise deleted successfully.'

    await loadExercise()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Unable to connect to the server.'
  }
}

onMounted(() => {
  loadExercise()
})
</script>

<template>
  <main class="container">
    <section class="page-heading">
      <p class="label">ACTIVITY TRACKING</p>

      <h1>Exercise</h1>

      <p>
        Record your exercise and monitor calories burned.
      </p>
    </section>

    <p
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="success-message"
    >
      {{ successMessage }}
    </p>

    <section class="summary-grid">
      <div class="summary-card">
        <span>Calories Burned</span>

        <strong>
          {{ totalCaloriesBurned.toLocaleString() }}
        </strong>

        <p>kcal today</p>
      </div>

      <div class="summary-card">
        <span>Exercise Time</span>

        <strong>
          {{ totalDuration }}
        </strong>

        <p>minutes today</p>
      </div>

      <div class="summary-card">
        <span>Activities</span>

        <strong>
          {{ activities.length }}
        </strong>

        <p>recorded today</p>
      </div>
    </section>

    <section class="form-card">
      <div class="form-heading">
        <h2>Add Exercise</h2>

        <p>
          Record an activity you completed today.
        </p>
      </div>

      <form @submit.prevent="addActivity">
        <div class="form-grid">
          <div class="form-group">
            <label for="activity">
              Activity
            </label>

            <input
              id="activity"
              v-model="activityName"
              type="text"
              placeholder="e.g. Weight Training"
              required
            />
          </div>

          <div class="form-group">
            <label for="duration">
              Duration (minutes)
            </label>

            <input
              id="duration"
              v-model="duration"
              type="number"
              min="1"
              placeholder="e.g. 60"
              required
            />
          </div>

          <div class="form-group">
            <label for="calories">
              Calories burned
            </label>

            <input
              id="calories"
              v-model="caloriesBurned"
              type="number"
              min="1"
              placeholder="e.g. 350"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          class="primary-button"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : '+ Add Exercise' }}
        </button>
      </form>
    </section>

    <section class="activity-card">
      <div class="activity-heading">
        <h2>Today's Activities</h2>

        <span>
          {{ activities.length }}
          {{ activities.length === 1 ? 'activity' : 'activities' }}
        </span>
      </div>

      <div
        v-if="loading"
        class="empty-state"
      >
        Loading activities...
      </div>

      <div
        v-else-if="activities.length === 0"
        class="empty-state"
      >
        No exercise recorded today.
      </div>

      <template v-else>
        <div
          v-for="activity in activities"
          :key="activity.exercise_id"
          class="activity-row"
        >
          <div class="activity-information">
            <strong>
              {{ activity.activity_name }}
            </strong>

            <p>
              {{ activity.duration }} minutes
            </p>
          </div>

          <div class="activity-actions">
            <strong>
              {{ Number(activity.calories_burned).toLocaleString() }}
              kcal
            </strong>

            <button
              type="button"
              class="delete-button"
              @click="deleteActivity(activity.exercise_id)"
            >
              Delete
            </button>
          </div>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.container {
  width: 86%;
  max-width: 1100px;
  margin: 45px auto;
  padding-bottom: 50px;
}

.page-heading {
  margin-bottom: 30px;
}

.label {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1.5px;
}

.page-heading h1 {
  margin: 8px 0;
  font-size: 32px;
}

.page-heading p {
  color: #6b7280;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.success-message {
  background: #dcfce7;
  color: #166534;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 24px;
}

.summary-card,
.form-card,
.activity-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.summary-card {
  padding: 22px;
}

.summary-card span {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
}

.summary-card strong {
  display: block;
  font-size: 28px;
}

.summary-card p {
  margin: 4px 0 0;
  color: #6b7280;
}

.form-card {
  padding: 24px;
  margin-bottom: 24px;
}

.form-heading h2 {
  margin: 0 0 6px;
}

.form-heading p {
  margin: 0;
  color: #6b7280;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 15px;
  margin: 24px 0;
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
  background: white;
}

.primary-button {
  border: none;
  border-radius: 8px;
  padding: 12px 18px;
  background: #1f2937;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.activity-card {
  padding: 24px;
}

.activity-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-heading h2 {
  margin: 0;
}

.activity-heading span {
  color: #6b7280;
}

.activity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 0;
  border-top: 1px solid #e5e7eb;
}

.activity-row:first-of-type {
  margin-top: 18px;
}

.activity-information p {
  margin: 5px 0 0;
  color: #6b7280;
}

.activity-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.delete-button {
  border: none;
  border-radius: 7px;
  padding: 8px 12px;
  background: #fee2e2;
  color: #991b1b;
  cursor: pointer;
}

.empty-state {
  color: #9ca3af;
  padding: 24px 0 5px;
}

@media (max-width: 750px) {
  .container {
    width: 92%;
  }

  .summary-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .activity-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .activity-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>