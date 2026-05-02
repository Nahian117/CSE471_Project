const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['electronics', 'books', 'clothing', 'furniture', 'sports', 'other']
  },
  condition: {
    type: String,
    required: true,
    enum: ['new', 'used', 'good']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String
  }],
  university: {
    type: String,
    required: true // From seller's email domain
  },
  location: {
    type: String,
    trim: true
  },
  // Google Maps pickup point
  pickupLocation: {
    name:    { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1, condition: 1, price: 1, university: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);