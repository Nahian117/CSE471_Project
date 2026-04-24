const mongoose = require('mongoose');

const savedFilterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    category: {
      type: String,
      enum: ['electronics', 'books', 'clothing', 'furniture', 'sports', 'other']
    },
    condition: {
      type: String,
      enum: ['new', 'used', 'good']
    },
    minPrice: {
      type: Number,
      min: 0
    },
    maxPrice: {
      type: Number,
      min: 0
    },
    university: {
      type: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastNotified: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SavedFilter', savedFilterSchema);