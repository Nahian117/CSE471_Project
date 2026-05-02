const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.createReview = async (req, res) => {
  try {
    const { transactionId, rating, feedback } = req.body;
    const reviewerId = req.userId;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (transaction.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed transactions' });
    }

    let revieweeId;
    let isBuyer = false;

    if (transaction.buyer.toString() === reviewerId) {
      revieweeId = transaction.seller;
      isBuyer = true;
      if (transaction.buyerReviewed) {
        return res.status(400).json({ message: 'You have already reviewed this transaction' });
      }
    } else if (transaction.seller.toString() === reviewerId) {
      revieweeId = transaction.buyer;
      if (transaction.sellerReviewed) {
        return res.status(400).json({ message: 'You have already reviewed this transaction' });
      }
    } else {
      return res.status(403).json({ message: 'Not authorized to review this transaction' });
    }

    const review = new Review({
      transaction: transactionId,
      reviewer: reviewerId,
      reviewee: revieweeId,
      rating,
      feedback
    });

    await review.save();

    // Mark as reviewed
    if (isBuyer) {
      transaction.buyerReviewed = true;
    } else {
      transaction.sellerReviewed = true;
    }
    await transaction.save();

    // Update user average rating
    const userReviews = await Review.find({ reviewee: revieweeId });
    const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / userReviews.length;

    await User.findByIdAndUpdate(revieweeId, {
      averageRating: avgRating,
      totalReviews: userReviews.length
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review', error: error.message });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ reviewee: userId })
      .populate('reviewer', 'name email')
      .populate('transaction', 'product')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};
