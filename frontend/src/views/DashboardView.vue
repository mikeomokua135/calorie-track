<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const foodEntries = ref([])
const exerciseEntries = ref([])
const loading = ref(true)
const errorMessage = ref('')

const editingGoal = ref(false)
const newGoal = ref('')
const savingGoal = ref(false)
const goalMessage = ref('')
const goalError = ref('')

const firstName = ref(
  localStorage.getItem('first_name') || 'User',
)

const dailyGoal = ref(
  Number(localStorage.getItem('daily_calorie_goal')) || 2500,
)

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

const totalConsumed = computed(() => {
  return foodEntries.value.reduce(
    (total, entry) => total + Number(entry.calories),
    0,
  )
})

const totalBurned = computed(() => {
  return exerciseEntries.value.reduce(
    (total, entry) =>
      total + Number(entry.calories_burned),
    0,
  )
})

const remainingCalories = computed(() => {
  return Math.max(
    dailyGoal.value - totalConsumed.value,
    0,
  )
})

const progressPercentage = computed(() => {
  if (dailyGoal.value <= 0) {
    return 0
  }

  return Math.min(
    Math.round(
      (totalConsumed.value / dailyGoal.value) * 100,
    ),
    100,
  )
})

const mealCalories = (mealType) => {
  return foodEntries.value
    .filter(
      (entry) => entry.meal_type === mealType,
    )
    .reduce(
      (total, entry) =>
        total + Number(entry.calories),
      0,
    )
}

const loadDashboard = async () => {
  loading.value = true
  errorMessage.value = ''

  const sessionToken = getSessionToken()

  try {
    const [foodResponse, exerciseResponse] =
      await Promise.all([
        fetch(
          `https://calorie-track-api.onrender.com/food?date=${today()}`,
          {
            headers: {
              'X-Authorization': sessionToken,
            },
          },
        ),

        fetch(
          `https://calorie-track-api.onrender.com/exercise?date=${today()}`,
          {
            headers: {
              'X-Authorization': sessionToken,
            },
          },
        ),
      ])

    const foodData = await foodResponse.json()
    const exerciseData = await exerciseResponse.json()

    if (!foodResponse.ok) {
      errorMessage.value =
        foodData.error ||
        'Unable to load food information'

      return
    }

    if (!exerciseResponse.ok) {
      errorMessage.value =
        exerciseData.error ||
        'Unable to load exercise information'

      return
    }

    foodEntries.value = foodData
    exerciseEntries.value = exerciseData
  } catch (error) {
    console.error(error)

    errorMessage.value =
      'Unable to connect to the server.'
  } finally {
    loading.value = false
  }
}


// ========================================
// EDIT DAILY CALORIE GOAL
// ========================================

const startEditingGoal = () => {
  newGoal.value = dailyGoal.value
  goalMessage.value = ''
  goalError.value = ''
  editingGoal.value = true
}

const cancelEditingGoal = () => {
  newGoal.value = ''
  goalMessage.value = ''
  goalError.value = ''
  editingGoal.value = false
}

const updateCalorieGoal = async () => {
  goalMessage.value = ''
  goalError.value = ''

  const calorieGoal = Number(newGoal.value)

  if (
    !Number.isInteger(calorieGoal) ||
    calorieGoal <= 0 ||
    calorieGoal > 10000
  ) {
    goalError.value =
      'Enter a calorie goal between 1 and 10,000 kcal.'

    return
  }

  savingGoal.value = true

  try {
    const response = await fetch(
      'https://calorie-track-api.onrender.com/profile/calorie-goal',
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': getSessionToken(),
        },

        body: JSON.stringify({
          daily_calorie_goal: calorieGoal,
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      goalError.value =
        data.error ||
        'Unable to update calorie goal.'

      return
    }

    dailyGoal.value = data.daily_calorie_goal

    localStorage.setItem(
      'daily_calorie_goal',
      String(data.daily_calorie_goal),
    )

    goalMessage.value =
      'Daily calorie goal updated successfully.'

    editingGoal.value = false
    newGoal.value = ''
  } catch (error) {
    console.error(error)

    goalError.value =
      'Unable to connect to the server.'
  } finally {
    savingGoal.value = false
  }
}

const goToFoodDiary = () => {
  router.push('/diary')
}

const goToExercise = () => {
  router.push('/exercise')
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <main class="container">
    <section class="welcome">
      <p class="label">DAILY OVERVIEW</p>

      <h1>
        Welcome back, {{ firstName }}
      </h1>

      <p>
        Here's your calorie overview for today.
      </p>
    </section>

    <p
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="goalMessage"
      class="success-message"
    >
      {{ goalMessage }}
    </p>

    <p
      v-if="goalError"
      class="error-message"
    >
      {{ goalError }}
    </p>

    <div
      v-if="loading"
      class="loading"
    >
      Loading your dashboard...
    </div>

    <template v-else>
      <section class="calorie-cards">
        <div class="card goal-card">
          <p>Daily Goal</p>

          <h2>
            {{ dailyGoal.toLocaleString() }}
          </h2>

          <span>kcal</span>

          <button
            class="edit-goal-button"
            @click="startEditingGoal"
          >
            Edit Goal
          </button>
        </div>

        <div class="card">
          <p>Consumed</p>

          <h2>
            {{ totalConsumed.toLocaleString() }}
          </h2>

          <span>kcal</span>
        </div>

        <div class="card">
          <p>Remaining</p>

          <h2>
            {{ remainingCalories.toLocaleString() }}
          </h2>

          <span>kcal</span>
        </div>

        <div class="card">
          <p>Exercise</p>

          <h2>
            {{ totalBurned.toLocaleString() }}
          </h2>

          <span>kcal burned</span>
        </div>
      </section>


      <!-- EDIT GOAL FORM -->

      <section
        v-if="editingGoal"
        class="goal-editor"
      >
        <div>
          <h2>Update Daily Goal</h2>

          <p>
            Enter your new daily calorie target.
          </p>
        </div>

        <div class="goal-form">
          <div class="goal-input-wrapper">
            <input
              v-model="newGoal"
              type="number"
              min="1"
              max="10000"
              step="1"
              placeholder="e.g. 2800"
              @keyup.enter="updateCalorieGoal"
            />

            <span>kcal</span>
          </div>

          <button
            class="save-button"
            :disabled="savingGoal"
            @click="updateCalorieGoal"
          >
            {{
              savingGoal
                ? 'Saving...'
                : 'Save Goal'
            }}
          </button>

          <button
            class="cancel-button"
            :disabled="savingGoal"
            @click="cancelEditingGoal"
          >
            Cancel
          </button>
        </div>
      </section>


      <!-- DAILY PROGRESS -->

      <section class="progress-section">
        <div class="section-heading">
          <div>
            <h2>Daily Progress</h2>

            <p>
              {{ totalConsumed.toLocaleString() }}
              of
              {{ dailyGoal.toLocaleString() }}
              kcal consumed
            </p>
          </div>

          <strong>
            {{ progressPercentage }}%
          </strong>
        </div>

        <div class="progress-bar">
          <div
            class="progress"
            :style="{
              width: `${progressPercentage}%`,
            }"
          ></div>
        </div>
      </section>


      <!-- TODAY'S MEALS -->

      <section class="meals">
        <div class="section-heading">
          <div>
            <h2>Today's Meals</h2>

            <p>
              Your calorie intake by meal.
            </p>
          </div>

          <button
            class="primary-button"
            @click="goToFoodDiary"
          >
            + Add Food
          </button>
        </div>

        <div class="meal">
          <span>Breakfast</span>

          <strong>
            {{ mealCalories('Breakfast').toLocaleString() }}
            kcal
          </strong>
        </div>

        <div class="meal">
          <span>Lunch</span>

          <strong>
            {{ mealCalories('Lunch').toLocaleString() }}
            kcal
          </strong>
        </div>

        <div class="meal">
          <span>Dinner</span>

          <strong>
            {{ mealCalories('Dinner').toLocaleString() }}
            kcal
          </strong>
        </div>

        <div class="meal">
          <span>Snacks</span>

          <strong>
            {{ mealCalories('Snacks').toLocaleString() }}
            kcal
          </strong>
        </div>
      </section>


      <!-- EXERCISE -->

      <section class="exercise-section">
        <div>
          <p class="exercise-label">
            TODAY'S ACTIVITY
          </p>

          <h2>
            {{ totalBurned.toLocaleString() }}
            kcal burned
          </h2>

          <p>
            {{ exerciseEntries.length }}

            {{
              exerciseEntries.length === 1
                ? 'activity'
                : 'activities'
            }}

            recorded today.
          </p>
        </div>

        <button
          class="secondary-button"
          @click="goToExercise"
        >
          View Exercise
        </button>
      </section>
    </template>
  </main>
</template>

<style scoped>
.container {
  width: 86%;
  max-width: 1100px;
  margin: 45px auto;
  padding-bottom: 50px;
}

.welcome {
  margin-bottom: 30px;
}

.label,
.exercise-label {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1.5px;
}

.welcome h1 {
  font-size: 32px;
  margin: 8px 0;
}

.welcome p {
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

.loading {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 30px;
  color: #6b7280;
}

.calorie-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.card,
.progress-section,
.meals,
.exercise-section,
.goal-editor {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.card {
  padding: 24px;
}

.card p {
  color: #6b7280;
  margin: 0;
}

.card h2 {
  font-size: 30px;
  margin: 10px 0 2px;
}

.card span {
  color: #6b7280;
}

.goal-card {
  position: relative;
}

.edit-goal-button {
  display: block;
  margin-top: 16px;
  padding: 7px 11px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: #f9fafb;
  color: #1f2937;
  cursor: pointer;
  font-weight: 600;
}

.edit-goal-button:hover {
  background: #f3f4f6;
}

.goal-editor {
  margin-top: 24px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 25px;
}

.goal-editor h2 {
  margin: 0 0 6px;
}

.goal-editor p {
  margin: 0;
  color: #6b7280;
}

.goal-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goal-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.goal-input-wrapper input {
  width: 120px;
  padding: 11px;
  border: none;
  outline: none;
  font-size: 15px;
}

.goal-input-wrapper span {
  padding-right: 12px;
  color: #6b7280;
  font-size: 14px;
}

.save-button,
.cancel-button {
  border: none;
  border-radius: 8px;
  padding: 11px 16px;
  cursor: pointer;
  font-weight: 600;
}

.save-button {
  background: #1f2937;
  color: white;
}

.cancel-button {
  background: #f3f4f6;
  color: #1f2937;
}

.save-button:disabled,
.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-section,
.meals {
  margin-top: 24px;
  padding: 24px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.section-heading h2 {
  margin: 0;
}

.section-heading p {
  margin: 6px 0 0;
  color: #6b7280;
}

.section-heading > strong {
  font-size: 22px;
}

.progress-bar {
  height: 14px;
  background: #e5e7eb;
  border-radius: 20px;
  margin-top: 20px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: #1f2937;
  border-radius: 20px;
  transition: width 0.3s ease;
}

.primary-button,
.secondary-button {
  border: none;
  border-radius: 8px;
  padding: 11px 18px;
  cursor: pointer;
  font-weight: 600;
}

.primary-button {
  background: #1f2937;
  color: white;
}

.secondary-button {
  background: #f3f4f6;
  color: #1f2937;
}

.meal {
  display: flex;
  justify-content: space-between;
  padding: 18px 0;
  border-bottom: 1px solid #e5e7eb;
}

.meal:last-child {
  border-bottom: none;
}

.exercise-section {
  margin-top: 24px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.exercise-section h2 {
  margin: 7px 0;
}

.exercise-section p:last-child {
  color: #6b7280;
  margin-bottom: 0;
}

@media (max-width: 900px) {
  .calorie-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .goal-editor {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .container {
    width: 92%;
    margin-top: 30px;
  }

  .calorie-cards {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .exercise-section {
    align-items: flex-start;
    flex-direction: column;
  }

  .goal-form {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .goal-input-wrapper {
    width: 100%;
  }

  .goal-input-wrapper input {
    flex: 1;
  }
}
</style>