const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const User = require('./models/User')
const { startReminderJob } = require('./utils/reminderJob')

const app = express()

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://cse471-project-3.onrender.com"
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req, res, next) => {
  console.log('REQUEST', req.method, req.url, req.headers['content-type'], req.body)
  next()
})

const trustScoreRoutes = require('./routes/trustScore.routes')
app.use('/api/trust-score', trustScoreRoutes)
const authRoutes = require('./routes/auth.routes')
app.use('/api/auth', authRoutes)

const productRoutes = require('./routes/product.routes')
app.use('/api/products', productRoutes)
const messageRoutes = require('./routes/message.routes')
app.use('/api/messages', messageRoutes)
const filterRoutes = require('./routes/filter.routes')
app.use('/api/filters', filterRoutes)
const notificationRoutes = require('./routes/notification.routes')
app.use('/api/notifications', notificationRoutes)

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR', err)
  res.status(500).json({ message: 'Server error', error: err.message })
})

app.get('/', (req, res) => {
  res.send('Server is running!')
})

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected!')

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@g.bracu.ac.bd').toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123'

    let adminUser = await User.findOne({ email: adminEmail })
    if (!adminUser) {
      // Create admin for the first time — pre('save') will hash the password
      adminUser = new User({
        name: 'Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true
      })
      await adminUser.save()
      console.log(`Default admin user created: ${adminEmail}`)
    } else {
      // Only fix role/verification, do NOT touch password to avoid double-hashing
      let changed = false
      if (adminUser.role !== 'admin') { adminUser.role = 'admin'; changed = true }
      if (!adminUser.isEmailVerified) { adminUser.isEmailVerified = true; changed = true }
      if (changed) await adminUser.save()
      console.log(`Default admin credentials ensured for: ${adminEmail}`)
    }
  })
  .catch((err) => console.log('DB Error:', err))

app.listen(5000, () => {
  console.log('Server started on port 5000')
  startReminderJob()
})
