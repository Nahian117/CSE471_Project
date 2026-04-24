const express = require('express')
const router = express.Router()
const { getScore, createScore, updateScore } = require('../controllers/trustScore.controller')

// GET /api/trust-score/:userId
router.get('/:userId', getScore)

// POST /api/trust-score/:userId
router.post('/:userId', createScore)

// PUT /api/trust-score/:userId
router.put('/:userId', updateScore)

module.exports = router