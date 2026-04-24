const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['filter_match', 'pickup_reminder', 'pickup_confirmed', 'pickup_cancelled'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  // For filter_match: link to matched product
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  // For filter_match: the saved filter that triggered it
  savedFilter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavedFilter'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
