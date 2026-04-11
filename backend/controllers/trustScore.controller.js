const TrustScore = require('../models/TrustScore')

const getScore = async (req, res) => {
  try {
    const score = await TrustScore.findOne({ user: req.params.userId })
    if (!score) return res.status(404).json({ message: 'Trust score not found' })
    res.json(score)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const createScore = async (req, res) => {
  try {
    const existing = await TrustScore.findOne({ user: req.params.userId })
    if (existing) return res.status(400).json({ message: 'Trust score already exists' })
    const score = new TrustScore({ user: req.params.userId })
    await score.save()
    res.status(201).json(score)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateScore = async (req, res) => {
  try {
    const score = await TrustScore.findOne({ user: req.params.userId })
    if (!score) return res.status(404).json({ message: 'Trust score not found' })
    const { completedTransactions, positiveReviews, totalReviews, disputesLost } = req.body
    if (completedTransactions !== undefined) score.completedTransactions = completedTransactions
    if (positiveReviews !== undefined) score.positiveReviews = positiveReviews
    if (totalReviews !== undefined) score.totalReviews = totalReviews
    if (disputesLost !== undefined) score.disputesLost = disputesLost
    await score.save()
    res.json(score)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { getScore, createScore, updateScore }