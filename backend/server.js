const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const User = require('./models/User')
const { startReminderJob } = require('./utils/reminderJob')

const app = express()

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

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
const transactionRoutes = require('./routes/transaction.routes')
app.use('/api/transactions', transactionRoutes)
const disputeRoutes = require('./routes/dispute.routes')
app.use('/api/disputes', disputeRoutes)
const reviewRoutes = require('./routes/review.routes')
app.use('/api/reviews', reviewRoutes)
const reportRoutes = require('./routes/report.routes')
app.use('/api/reports', reportRoutes)

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR', err)
  
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err.message === 'Not an image! Please upload only images.') {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: 'Server error', error: err.message })
})

app.get('/', (req, res) => {
  res.send('Server is running!')
})

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4
})
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