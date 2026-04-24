const mongoose = require('mongoose')

const trustScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  completedTransactions: { type: Number, default: 0 },
  positiveReviews:       { type: Number, default: 0 },
  totalReviews:          { type: Number, default: 0 },
  disputesLost:          { type: Number, default: 0 },
  accountCreatedAt:      { type: Date, default: Date.now },
  score:                 { type: Number, default: 0, min: 0, max: 100 },
  breakdown: {
    txScore:       { type: Number, default: 0 },
    reviewScore:   { type: Number, default: 0 },
    disputeScore:  { type: Number, default: 0 },
    ageScore:      { type: Number, default: 0 }
  }
}, { timestamps: true })

trustScoreSchema.pre('save', function() {
  const txScore = Math.min(this.completedTransactions * 2, 40)
  const ratio = this.totalReviews > 0 ? this.positiveReviews / this.totalReviews : 0
  const reviewScore = Math.round(ratio * 35)
  const disputeScore = 15 - Math.min(this.disputesLost * 5, 15)
  const monthsOld = Math.floor(
    (Date.now() - new Date(this.accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )
  const ageScore = Math.min(monthsOld * 2, 10)
  this.breakdown = { txScore, reviewScore, disputeScore, ageScore }
  this.score = txScore + reviewScore + disputeScore + ageScore
})

module.exports = mongoose.model('TrustScore', trustScoreSchema)