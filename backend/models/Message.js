const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    trim: true
  },
  // message type: 'text' = normal, 'pickup' = pickup proposal, 'reminder' = auto reminder
  messageType: {
    type: String,
    enum: ['text', 'pickup', 'reminder'],
    default: 'text'
  },
  pickupTime: {
    type: Date
  },
  pickupLocation: {
    type: String,
    trim: true
  },
  pickupStatus: {
    type: String,
    enum: ['proposed', 'confirmed', 'cancelled'],
    default: 'proposed'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for chat conversations
messageSchema.index({ sender: 1, receiver: 1, product: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);