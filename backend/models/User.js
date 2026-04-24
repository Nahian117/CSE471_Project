const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => /^[^\s@]+@g\.bracu\.ac\.bd$/i.test(value),
      message: 'Only @g.bracu.ac.bd email addresses are allowed'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'moderator'],
    default: 'student'
  },
  studentType: {
    type: String,
    enum: ['buyer', 'seller'],
    default: 'buyer'
  },
  studentId: {
    type: String,
    trim: true
  },
  studentIdImage: {
    type: String
  },
  studentVerificationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected', 'renewal-required'],
    default: 'none'
  },
  studentVerificationExpiry: {
    type: Date
  },
  // Preferred pickup location for reminder timing adjustment
  preferredPickupLocation: {
    type: String,
    trim: true,
    default: ''
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isStudentVerified: {
    type: Boolean,
    default: false
  },
  emailOTP: {
    type: String
  },
  emailOTPExpiry: {
    type: Date
  }
}, { timestamps: true })

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', userSchema)