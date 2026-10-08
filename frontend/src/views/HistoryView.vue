<script setup>
import { ref, computed, onMounted } from 'vue'

const foodEntries = ref([])
const exerciseEntries = ref([])
const loading = ref(true)
const errorMessage = ref('')

const dailyGoal = ref(
  Number(localStorage.getItem('daily_calorie_goal')) || 2500,
)

const getSessionToken = () => {
  return localStorage.getItem('session_token')
}

const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const lastSevenDays = computed(() => {
  const days = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - i)

    const dateKey = formatDateKey(date)

    const calories = foodEntries.value
      .filter((entry) => entry.entry_date === dateKey)
      .reduce(
        (total, entry) =>
          total + Number(entry.calories),
        0,
      )

    const caloriesBurned = exerciseEntries.value
      .filter((entry) => entry.entry_date === dateKey)
      .reduce(
        (total, entry) =>
          total + Number(entry.calories_burned),
        0,
      )

    days.push({
      dateKey,

      day: date.toLocaleDateString('en-GB', {
        weekday: 'short',
      }),

      date: date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }),

      calories,
      caloriesBurned,
    })
  }

  return days
})

const averageCalories = computed(() => {
  const total = lastSevenDays.value.reduce(
    (sum, entry) => sum + entry.calories,
    0,
  )

  return Math.round(total / 7)
})

const highestCalories = computed(() => {
  if (lastSevenDays.value.length === 0) {
    return 0
  }

  return Math.max(
    ...lastSevenDays.value.map(
      (entry) => entry.calories,
    ),
  )
})

const daysWithinGoal = computed(() => {
  return lastSevenDays.value.filter(
    (entry) =>
      entry.calories > 0 &&
      entry.calories <= dailyGoal.value,
  ).length
})

const totalExerciseCalories = computed(() => {
  return lastSevenDays.value.reduce(
    (total, entry) =>
      total + entry.caloriesBurned,
    0,
  )
})

const barHeight = (calories) => {
  const maximum = Math.max(
    dailyGoal.value * 1.2,
    highestCalories.value,
    1,
  )

  return `${Math.min(
    (calories / maximum) * 100,
    100,
  )}%`
}

const loadHistory = async () => {
  loading.value = true
  errorMessage.value = ''

  const sessionToken = getSessionToken()

  try {
    const [foodResponse, exerciseResponse] =
      await Promise.all([
        fetch('http://localhost:3333/food', {
          headers: {
            'X-Authorization': sessionToken,
          },
        }),

        fetch('http://localhost:3333/exercise', {
          headers: {
            'X-Authorization': sessionToken,
          },
        }),
      ])

    const foodData = await foodResponse.json()
    const exerciseData = await exerciseResponse.json()

    if (!foodResponse.ok) {
      errorMessage.value =
        foodData.error ||
        'Unable to load food history'

      return
    }

    if (!exerciseResponse.ok) {
      errorMessage.value =
        exerciseData.error ||
        'Unable to load exercise history'

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

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <main class="container">
    <section class="page-heading">
      <p class="label">PROGRESS</p>

      <h1>Calorie History</h1>

      <p>
        Review your calorie intake over the last seven days.
      </p>
    </section>

    <p
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </p>

    <div
      v-if="loading"
      class="loading"
    >
      Loading your calorie history...
    </div>

    <template v-else>
      <section class="summary-grid">
        <div class="summary-card">
          <span>Daily Goal</span>

          <strong>
            {{ dailyGoal.toLocaleString() }}
          </strong>

          <p>kcal</p>
        </div>

        <div class="summary-card">
          <span>7-Day Average</span>

          <strong>
            {{ averageCalories.toLocaleString() }}
          </strong>

          <p>kcal</p>
        </div>

        <div class="summary-card">
          <span>Highest Day</span>

          <strong>
            {{ highestCalories.toLocaleString() }}
          </strong>

          <p>kcal</p>
        </div>

        <div class="summary-card">
          <span>Days Within Goal</span>

          <strong>
            {{ daysWithinGoal }}/7
          </strong>

          <p>days</p>
        </div>
      </section>

      <section class="chart-card">
        <div class="chart-heading">
          <div>
            <h2>Weekly Intake</h2>

            <p>
              Calories consumed each day
            </p>
          </div>

          <div class="goal-key">
            Daily goal:
            {{ dailyGoal.toLocaleString() }}
            kcal
          </div>
        </div>

        <div class="chart">
          <div
            v-for="entry in lastSevenDays"
            :key="entry.dateKey"
            class="chart-column"
          >
            <div class="bar-area">
              <span class="calorie-value">
                {{ entry.calories }}
              </span>

              <div
                class="bar"
                :class="{
                  overGoal:
                    entry.calories > dailyGoal,
                }"
                :style="{
                  height: barHeight(entry.calories),
                }"
              ></div>
            </div>

            <strong>
              {{ entry.day }}
            </strong>

            <span class="date">
              {{ entry.date }}
            </span>
          </div>
        </div>
      </section>

      <section class="exercise-summary">
        <div>
          <p class="exercise-label">
            WEEKLY ACTIVITY
          </p>

          <h2>
            {{ totalExerciseCalories.toLocaleString() }}
            kcal burned
          </h2>

          <p>
            Total calories recorded from exercise
            during the last seven days.
          </p>
        </div>
      </section>

      <section class="history-card">
        <h2>Daily Breakdown</h2>

        <div
          v-for="entry in [...lastSevenDays].reverse()"
          :key="entry.dateKey"
          class="history-row"
        >
          <div class="date-information">
            <strong>
              {{ entry.day }}
            </strong>

            <span>
              {{ entry.date }}
            </span>
          </div>

          <div class="history-result">
            <strong>
              {{ entry.calories.toLocaleString() }}
              kcal consumed
            </strong>

            <span class="burned">
              {{ entry.caloriesBurned.toLocaleString() }}
              kcal burned
            </span>

            <span
              v-if="entry.calories === 0"
              class="no-data"
            >
              No food recorded
            </span>

            <span
              v-else
              :class="
                entry.calories <= dailyGoal
                  ? 'within'
                  : 'above'
              "
            >
              {{
                entry.calories <= dailyGoal
                  ? 'Within goal'
                  : 'Above goal'
              }}
            </span>
          </div>
        </div>
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

.page-heading {
  margin-bottom: 30px;
}

.label,
.exercise-label {
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

.loading {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 30px;
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 24px;
}

.summary-card,
.chart-card,
.history-card,
.exercise-summary {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.summary-card {
  padding: 22px;
}

.summary-card span {
  color: #6b7280;
  display: block;
  margin-bottom: 8px;
}

.summary-card strong {
  display: block;
  font-size: 27px;
}

.summary-card p {
  color: #6b7280;
  margin: 4px 0 0;
}

.chart-card {
  padding: 24px;
  margin-bottom: 24px;
}

.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.chart-heading h2 {
  margin: 0 0 5px;
}

.chart-heading p {
  margin: 0;
  color: #6b7280;
}

.goal-key {
  color: #6b7280;
  font-size: 14px;
}

.chart {
  height: 300px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 15px;
  margin-top: 35px;
  padding-top: 20px;
  border-bottom: 1px solid #d1d5db;
}

.chart-column {
  flex: 1;
  height: 100%;
  max-width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bar-area {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.calorie-value {
  font-size: 12px;
  margin-bottom: 7px;
}

.bar {
  width: 65%;
  min-height: 3px;
  background: #1f2937;
  border-radius: 6px 6px 0 0;
  transition: height 0.3s ease;
}

.bar.overGoal {
  background: #6b7280;
}

.chart-column strong {
  margin-top: 10px;
}

.date {
  color: #9ca3af;
  font-size: 12px;
  margin-top: 3px;
}

.exercise-summary {
  padding: 24px;
  margin-bottom: 24px;
}

.exercise-summary h2 {
  margin: 7px 0;
}

.exercise-summary p:last-child {
  color: #6b7280;
  margin-bottom: 0;
}

.history-card {
  padding: 24px;
}

.history-card h2 {
  margin-top: 0;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 17px 0;
  border-top: 1px solid #e5e7eb;
}

.date-information {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-information span {
  color: #6b7280;
}

.history-result {
  text-align: right;
}

.history-result strong,
.history-result span {
  display: block;
}

.history-result span {
  margin-top: 5px;
  font-size: 13px;
}

.history-result .within {
  color: #166534;
}

.history-result .above {
  color: #991b1b;
}

.history-result .burned,
.history-result .no-data {
  color: #6b7280;
}

@media (max-width: 800px) {
  .container {
    width: 92%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-heading {
    flex-direction: column;
    gap: 15px;
  }

  .calorie-value {
    font-size: 10px;
  }
}

@media (max-width: 500px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .history-row {
    align-items: flex-start;
    gap: 15px;
  }
}
</style>