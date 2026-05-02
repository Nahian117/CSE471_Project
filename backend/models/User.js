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
  // OCR Auto-Verification fields
  ocrExtractedText: {
    type: String,
    default: ''
  },
  ocrVerificationStatus: {
    type: String,
    enum: ['not_processed', 'auto_verified', 'auto_failed', 'pending_manual'],
    default: 'not_processed'
  },
  ocrConfidence: {
    type: Number, // 0-100 match score
    default: 0
  },
  ocrProcessedAt: {
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
  walletBalance: {
    type: Number,
    default: 10000 // Give dummy balance for testing
  },
  escrowBalance: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isStudentVerified: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  emailOTP: {
    type: String
  },
  emailOTPExpiry: {
    type: Date
  },
  // Firebase Cloud Messaging
  fcmToken: {
    type: String,
    default: null
  },
  notificationPreferences: {
    transactions: { type: Boolean, default: true },
    disputes:     { type: Boolean, default: true },
    wishlist:     { type: Boolean, default: true },
    adminActions: { type: Boolean, default: true },
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