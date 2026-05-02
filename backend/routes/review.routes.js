const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, reviewController.createReview);
router.get('/user/:userId', reviewController.getUserReviews);

module.exports = router;
