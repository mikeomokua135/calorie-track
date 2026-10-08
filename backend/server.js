const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const db = require('./database')

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors())
app.use(express.json())


//authentication 

const authenticateUser = (req, res, next) => {
  const sessionToken = req.headers['x-authorization']

  if (!sessionToken) {
    return res.status(401).json({
      error: 'Authentication required',
    })
  }

  db.get(
    `
      SELECT
        sessions.user_id,
        users.first_name,
        users.daily_calorie_goal
      FROM sessions
      JOIN users
        ON sessions.user_id = users.user_id
      WHERE sessions.session_token = ?
    `,
    [sessionToken],
    (err, user) => {
      if (err) {
        console.error(err)

        return res.status(500).json({
          error: 'Authentication error',
        })
      }

      if (!user) {
        return res.status(401).json({
          error: 'Invalid session',
        })
      }

      req.user = user
      next()
    },
  )
}


//api test

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'CalorieTrack API is running',
  })
})


// database test endpoint

app.get('/database-test', (req, res) => {
  db.get(
    'SELECT COUNT(*) AS user_count FROM users',
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: 'Database error',
        })
      }

      res.status(200).json({
        message: 'Database connected successfully',
        users: row.user_count,
      })
    },
  )
})


// register

app.post('/users', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      daily_calorie_goal,
    } = req.body

    if (
      !first_name ||
      !last_name ||
      !email ||
      !password ||
      !daily_calorie_goal
    ) {
      return res.status(400).json({
        error: 'All fields are required',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      })
    }

    const calorieGoal = Number(daily_calorie_goal)

    if (
      !Number.isInteger(calorieGoal) ||
      calorieGoal <= 0
    ) {
      return res.status(400).json({
        error:
          'Daily calorie goal must be a positive number',
      })
    }

    const cleanEmail = email.trim().toLowerCase()

    const hashedPassword = await bcrypt.hash(
      password,
      12,
    )

    const sql = `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        password,
        daily_calorie_goal
      )
      VALUES (?, ?, ?, ?, ?)
    `

    db.run(
      sql,
      [
        first_name.trim(),
        last_name.trim(),
        cleanEmail,
        hashedPassword,
        calorieGoal,
      ],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
              error:
                'An account with this email already exists',
            })
          }

          console.error(err)

          return res.status(500).json({
            error: 'Unable to create account',
          })
        }

        return res.status(201).json({
          message: 'Account created successfully',
          user_id: this.lastID,
        })
      },
    )
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Server error',
    })
  }
})


//my login

app.post('/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
    })
  }

  const cleanEmail = email.trim().toLowerCase()

  db.get(
    `
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        password,
        daily_calorie_goal
      FROM users
      WHERE email = ?
    `,
    [cleanEmail],
    async (err, user) => {
      if (err) {
        console.error(err)

        return res.status(500).json({
          error: 'Unable to login',
        })
      }

      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password',
        })
      }

      try {
        const passwordMatches =
          await bcrypt.compare(
            password,
            user.password,
          )

        if (!passwordMatches) {
          return res.status(401).json({
            error: 'Invalid email or password',
          })
        }

        const sessionToken = crypto
          .randomBytes(32)
          .toString('hex')

        db.run(
          `
            INSERT INTO sessions (
              user_id,
              session_token
            )
            VALUES (?, ?)
          `,
          [user.user_id, sessionToken],
          function (sessionError) {
            if (sessionError) {
              console.error(sessionError)

              return res.status(500).json({
                error: 'Unable to create session',
              })
            }

            return res.status(200).json({
              message: 'Login successful',
              user_id: user.user_id,
              first_name: user.first_name,
              last_name: user.last_name,
              daily_calorie_goal:
                user.daily_calorie_goal,
              session_token: sessionToken,
            })
          },
        )
      } catch (error) {
        console.error(error)

        return res.status(500).json({
          error: 'Server error',
        })
      }
    },
  )
})


//logout

app.post('/logout', (req, res) => {
  const sessionToken =
    req.headers['x-authorization']

  if (!sessionToken) {
    return res.status(401).json({
      error: 'Authentication required',
    })
  }

  db.run(
    `
      DELETE FROM sessions
      WHERE session_token = ?
    `,
    [sessionToken],
    function (err) {
      if (err) {
        console.error(err)

        return res.status(500).json({
          error: 'Unable to logout',
        })
      }

      if (this.changes === 0) {
        return res.status(401).json({
          error: 'Invalid session',
        })
      }

      return res.status(200).json({
        message: 'Logout successful',
      })
    },
  )
})


//update calorie goal

app.put(
  '/profile/calorie-goal',
  authenticateUser,
  (req, res) => {
    const calorieGoal = Number(
      req.body.daily_calorie_goal,
    )

    if (
      !Number.isInteger(calorieGoal) ||
      calorieGoal <= 0 ||
      calorieGoal > 10000
    ) {
      return res.status(400).json({
        error:
          'Daily calorie goal must be between 1 and 10,000 kcal',
      })
    }

    db.run(
      `
        UPDATE users
        SET daily_calorie_goal = ?
        WHERE user_id = ?
      `,
      [
        calorieGoal,
        req.user.user_id,
      ],
      function (err) {
        if (err) {
          console.error(err)

          return res.status(500).json({
            error:
              'Unable to update calorie goal',
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            error: 'User not found',
          })
        }

        return res.status(200).json({
          message:
            'Daily calorie goal updated successfully',
          daily_calorie_goal: calorieGoal,
        })
      },
    )
  },
)


// add food entry

app.post('/food', authenticateUser, (req, res) => {
  const {
    food_name,
    calories,
    quantity,
    meal_type,
    entry_date,
  } = req.body

  const calorieValue = Number(calories)
  const quantityValue = Number(quantity)

  const allowedMeals = [
    'Breakfast',
    'Lunch',
    'Dinner',
    'Snacks',
  ]

  if (
    !food_name ||
    !Number.isFinite(calorieValue) ||
    calorieValue <= 0 ||
    !Number.isFinite(quantityValue) ||
    quantityValue <= 0 ||
    !allowedMeals.includes(meal_type) ||
    !entry_date
  ) {
    return res.status(400).json({
      error: 'Invalid food entry',
    })
  }

  db.run(
    `
      INSERT INTO food_entries (
        user_id,
        food_name,
        calories,
        quantity,
        meal_type,
        entry_date
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      req.user.user_id,
      food_name.trim(),
      calorieValue,
      quantityValue,
      meal_type,
      entry_date,
    ],
    function (err) {
      if (err) {
        console.error(err)

        return res.status(500).json({
          error: 'Unable to add food',
        })
      }

      return res.status(201).json({
        message: 'Food added successfully',
        entry_id: this.lastID,
      })
    },
  )
})

// get food entries

app.get('/food', authenticateUser, (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      entry_id,
      food_name,
      calories,
      quantity,
      meal_type,
      entry_date
    FROM food_entries
    WHERE user_id = ?
  `

  const parameters = [req.user.user_id]

  if (date) {
    sql += ` AND entry_date = ?`
    parameters.push(date)
  }

  sql += ` ORDER BY entry_id DESC`

  db.all(
    sql,
    parameters,
    (err, rows) => {
      if (err) {
        console.error(err)

        return res.status(500).json({
          error: 'Unable to retrieve food entries',
        })
      }

      return res.status(200).json(rows)
    },
  )
})



// Update food entry


app.put(
  '/food/:entry_id',
  authenticateUser,
  (req, res) => {
    const entryId = Number(req.params.entry_id)

    const {
      food_name,
      calories,
      quantity,
      meal_type,
      entry_date,
    } = req.body

    const calorieValue = Number(calories)
    const quantityValue = Number(quantity)

    const allowedMeals = [
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snacks',
    ]

    if (
      !Number.isInteger(entryId) ||
      entryId <= 0 ||
      !food_name ||
      !Number.isFinite(calorieValue) ||
      calorieValue <= 0 ||
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      !allowedMeals.includes(meal_type) ||
      !entry_date
    ) {
      return res.status(400).json({
        error: 'Invalid food entry',
      })
    }

    db.run(
      `
        UPDATE food_entries
        SET
          food_name = ?,
          calories = ?,
          quantity = ?,
          meal_type = ?,
          entry_date = ?
        WHERE entry_id = ?
        AND user_id = ?
      `,
      [
        food_name.trim(),
        calorieValue,
        quantityValue,
        meal_type,
        entry_date,
        entryId,
        req.user.user_id,
      ],
      function (err) {
        if (err) {
          console.error(err)

          return res.status(500).json({
            error: 'Unable to update food',
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Food entry not found',
          })
        }

        return res.status(200).json({
          message: 'Food updated successfully',
        })
      },
    )
  },
)



// delete food entry

app.delete(
  '/food/:entry_id',
  authenticateUser,
  (req, res) => {
    const entryId = Number(req.params.entry_id)

    if (
      !Number.isInteger(entryId) ||
      entryId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid food entry',
      })
    }

    db.run(
      `
        DELETE FROM food_entries
        WHERE entry_id = ?
        AND user_id = ?
      `,
      [
        entryId,
        req.user.user_id,
      ],
      function (err) {
        if (err) {
          console.error(err)

          return res.status(500).json({
            error: 'Unable to delete food',
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Food entry not found',
          })
        }

        return res.status(200).json({
          message: 'Food deleted successfully',
        })
      },
    )
  },
)

// Add exercise entry

app.post(
  '/exercise',
  authenticateUser,
  (req, res) => {
    const {
      activity_name,
      duration,
      calories_burned,
      entry_date,
    } = req.body

    const durationValue = Number(duration)
    const caloriesValue =
      Number(calories_burned)

    if (
      !activity_name ||
      !Number.isFinite(durationValue) ||
      durationValue <= 0 ||
      !Number.isFinite(caloriesValue) ||
      caloriesValue <= 0 ||
      !entry_date
    ) {
      return res.status(400).json({
        error: 'Invalid exercise entry',
      })
    }

    db.run(
      `
        INSERT INTO exercise (
          user_id,
          activity_name,
          duration,
          calories_burned,
          entry_date
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.user.user_id,
        activity_name.trim(),
        durationValue,
        caloriesValue,
        entry_date,
      ],
      function (err) {
        if (err) {
          console.error(err)

          return res.status(500).json({
            error: 'Unable to add exercise',
          })
        }

        return res.status(201).json({
          message: 'Exercise added successfully',
          exercise_id: this.lastID,
        })
      },
    )
  },
)

// get the exercise entries

app.get(
  '/exercise',
  authenticateUser,
  (req, res) => {
    const { date } = req.query

    let sql = `
      SELECT
        exercise_id,
        activity_name,
        duration,
        calories_burned,
        entry_date
      FROM exercise
      WHERE user_id = ?
    `

    const parameters = [
      req.user.user_id,
    ]

    if (date) {
      sql += ` AND entry_date = ?`
      parameters.push(date)
    }

    sql += ` ORDER BY exercise_id DESC`

    db.all(
      sql,
      parameters,
      (err, rows) => {
        if (err) {
          console.error(err)

          return res.status(500).json({
            error:
              'Unable to retrieve exercise',
          })
        }

        return res.status(200).json(rows)
      },
    )
  },
)

// delete exercise entry

app.delete(
  '/exercise/:exercise_id',
  authenticateUser,
  (req, res) => {
    const exerciseId =
      Number(req.params.exercise_id)

    if (
      !Number.isInteger(exerciseId) ||
      exerciseId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid exercise entry',
      })
    }

    db.run(
      `
        DELETE FROM exercise
        WHERE exercise_id = ?
        AND user_id = ?
      `,
      [
        exerciseId,
        req.user.user_id,
      ],
      function (err) {
        if (err) {
          console.error(err)

          return res.status(500).json({
            error: 'Unable to delete exercise',
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            error: 'Exercise entry not found',
          })
        }

        return res.status(200).json({
          message:
            'Exercise deleted successfully',
        })
      },
    )
  },
)


// starting server

app.listen(PORT, () => {
  console.log(
    `CalorieTrack API running on http://localhost:${PORT}`,
  )
})