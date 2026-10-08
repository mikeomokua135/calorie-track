<script setup>
import {
  ref,
  computed,
  onMounted,
} from 'vue'

const showAddFood = ref(false)
const editingId = ref(null)

const foodName = ref('')
const calories = ref('')
const quantity = ref(1)
const mealType = ref('Breakfast')

const foodEntries = ref([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')

const mealTypes = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
]

const dailyGoal = computed(() => {
  return Number(
    localStorage.getItem('daily_calorie_goal'),
  ) || 2500
})

const today = () => {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const totalCalories = computed(() => {
  return foodEntries.value.reduce(
    (total, entry) => total + Number(entry.calories),
    0,
  )
})

const remainingCalories = computed(() => {
  return Math.max(
    dailyGoal.value - totalCalories.value,
    0,
  )
})

const entriesForMeal = (meal) => {
  return foodEntries.value.filter(
    (entry) => entry.meal_type === meal,
  )
}

const caloriesForMeal = (meal) => {
  return entriesForMeal(meal).reduce(
    (total, entry) => total + Number(entry.calories),
    0,
  )
}

const getSessionToken = () => {
  return localStorage.getItem('session_token')
}

const loadFood = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      `https://calorie-track-api.onrender.com/food?date=${today()}`,
      {
        headers: {
          'X-Authorization': getSessionToken(),
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to load food diary'

      return
    }

    foodEntries.value = data
  } catch (error) {
    console.error(error)

    errorMessage.value =
      'Unable to connect to the server.'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  foodName.value = ''
  calories.value = ''
  quantity.value = 1
  mealType.value = 'Breakfast'
  editingId.value = null
}

const openAddFood = () => {
  resetForm()
  errorMessage.value = ''
  showAddFood.value = true
}

const closeForm = () => {
  resetForm()
  showAddFood.value = false
}

const saveFood = async () => {
  errorMessage.value = ''

  if (
    !foodName.value.trim() ||
    Number(calories.value) <= 0 ||
    Number(quantity.value) <= 0
  ) {
    errorMessage.value =
      'Please enter valid food information.'

    return
  }

  saving.value = true

  const foodData = {
    food_name: foodName.value.trim(),
    calories: Number(calories.value),
    quantity: Number(quantity.value),
    meal_type: mealType.value,
    entry_date: today(),
  }

  try {
    const isEditing = editingId.value !== null

    const url = isEditing
      ? `https://calorie-track-api.onrender.com/food/${editingId.value}`
      : 'https://calorie-track-api.onrender.com/food'

    const response = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',

      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': getSessionToken(),
      },

      body: JSON.stringify(foodData),
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.error || 'Unable to save food'

      return
    }

    closeForm()

    await loadFood()
  } catch (error) {
    console.error(error)

    errorMessage.value =
      'Unable to connect to the server.'
  } finally {
    saving.value = false
  }
}

const editFood = (entry) => {
  editingId.value = entry.entry_id
  foodName.value = entry.food_name
  calories.value = entry.calories
  quantity.value = entry.quantity
  mealType.value = entry.meal_type

  errorMessage.value = ''
  showAddFood.value = true

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const deleteFood = async (entryId) => {
  errorMessage.value = ''

  try {
    const response = await fetch(
      `https://calorie-track-api.onrender.com/food/${entryId}`,
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
        data.error || 'Unable to delete food'

      return
    }

    await loadFood()
  } catch (error) {
    console.error(error)

    errorMessage.value =
      'Unable to connect to the server.'
  }
}

onMounted(() => {
  loadFood()
})
</script>

<template>
  <main class="container">
    <section class="page-heading">
      <div>
        <p class="label">
          FOOD TRACKING
        </p>

        <h1>Food Diary</h1>

        <p>
          Record and review everything you've eaten today.
        </p>
      </div>

      <button
        class="primary-button"
        @click="openAddFood"
      >
        + Add Food
      </button>
    </section>

    <p
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </p>

    <section class="summary-card">
      <div>
        <span>Today's Intake</span>

        <strong>
          {{ totalCalories.toLocaleString() }} kcal
        </strong>
      </div>

      <div>
        <span>Daily Goal</span>

        <strong>
          {{ dailyGoal.toLocaleString() }} kcal
        </strong>
      </div>

      <div>
        <span>Remaining</span>

        <strong>
          {{ remainingCalories.toLocaleString() }} kcal
        </strong>
      </div>
    </section>

    <section
      v-if="showAddFood"
      class="add-food-card"
    >
      <div class="form-heading">
        <div>
          <h2>
            {{
              editingId !== null
                ? 'Edit Food'
                : 'Add Food'
            }}
          </h2>

          <p>
            {{
              editingId !== null
                ? 'Update the food entry below.'
                : 'Record something you have eaten today.'
            }}
          </p>
        </div>

        <button
          class="close-button"
          type="button"
          @click="closeForm"
        >
          ×
        </button>
      </div>

      <form @submit.prevent="saveFood">
        <div class="form-grid">
          <div class="form-group">
            <label for="foodName">
              Food name
            </label>

            <input
              id="foodName"
              v-model="foodName"
              type="text"
              placeholder="e.g. Chicken and Rice"
              required
            />
          </div>

          <div class="form-group">
            <label for="calories">
              Calories
            </label>

            <input
              id="calories"
              v-model="calories"
              type="number"
              min="1"
              placeholder="e.g. 650"
              required
            />
          </div>

          <div class="form-group">
            <label for="quantity">
              Quantity
            </label>

            <input
              id="quantity"
              v-model="quantity"
              type="number"
              min="0.1"
              step="0.1"
              required
            />
          </div>

          <div class="form-group">
            <label for="mealType">
              Meal
            </label>

            <select
              id="mealType"
              v-model="mealType"
            >
              <option
                v-for="meal in mealTypes"
                :key="meal"
                :value="meal"
              >
                {{ meal }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="cancel-button"
            @click="closeForm"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="save-button"
            :disabled="saving"
          >
            {{
              saving
                ? 'Saving...'
                : editingId !== null
                  ? 'Save Changes'
                  : 'Save Food'
            }}
          </button>
        </div>
      </form>
    </section>

    <div
      v-if="loading"
      class="loading"
    >
      Loading food diary...
    </div>

    <template v-else>
      <section
        v-for="meal in mealTypes"
        :key="meal"
        class="meal-card"
      >
        <div class="meal-heading">
          <h2>{{ meal }}</h2>

          <strong>
            {{ caloriesForMeal(meal).toLocaleString() }}
            kcal
          </strong>
        </div>

        <div
          v-if="entriesForMeal(meal).length === 0"
          class="empty-meal"
        >
          No food recorded.
        </div>

        <div
          v-for="entry in entriesForMeal(meal)"
          :key="entry.entry_id"
          class="food-entry"
        >
          <div>
            <strong>
              {{ entry.food_name }}
            </strong>

            <p>
              Quantity: {{ entry.quantity }}
            </p>
          </div>

          <div class="entry-actions">
            <strong>
              {{ entry.calories }} kcal
            </strong>

            <button
              class="edit-button"
              @click="editFood(entry)"
            >
              Edit
            </button>

            <button
              class="delete-button"
              @click="deleteFood(entry.entry_id)"
            >
              Delete
            </button>
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
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
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

.primary-button,
.save-button {
  border: none;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  padding: 12px 18px;
  font-weight: 600;
  cursor: pointer;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 24px;
}

.summary-card div {
  padding: 22px;
  border-right: 1px solid #e5e7eb;
}

.summary-card div:last-child {
  border-right: none;
}

.summary-card span {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
}

.summary-card strong {
  font-size: 22px;
}

.add-food-card,
.meal-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.form-heading,
.meal-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-heading h2,
.meal-heading h2 {
  margin: 0;
}

.form-heading p {
  color: #6b7280;
  margin: 6px 0 0;
}

.close-button {
  border: none;
  background: transparent;
  font-size: 28px;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 15px;
  margin: 24px 0;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button {
  border: none;
  background: #f3f4f6;
  color: #1f2937;
  border-radius: 8px;
  padding: 12px 18px;
  font-weight: 600;
  cursor: pointer;
}

.food-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 0;
  border-top: 1px solid #e5e7eb;
}

.food-entry:first-of-type {
  margin-top: 18px;
}

.food-entry p {
  margin: 5px 0 0;
  color: #6b7280;
}

.entry-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.entry-actions button {
  border: none;
  padding: 8px 12px;
  border-radius: 7px;
  cursor: pointer;
}

.edit-button {
  background: #f3f4f6;
  color: #1f2937;
}

.delete-button {
  background: #fee2e2;
  color: #991b1b;
}

.empty-meal,
.loading {
  color: #9ca3af;
  padding-top: 20px;
}

.loading {
  padding: 30px 0;
}

@media (max-width: 750px) {
  .container {
    width: 92%;
  }

  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-card {
    grid-template-columns: 1fr;
  }

  .summary-card div {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .summary-card div:last-child {
    border-bottom: none;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .food-entry {
    align-items: flex-start;
    gap: 15px;
    flex-direction: column;
  }

  .entry-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>