const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['request', 'accepted', 'payment_confirmed', 'delivered', 'completed', 'cancelled', 'disputed'],
    default: 'request'
  },
  fundsOnHold: {
    type: Boolean,
    default: false
  },
  buyerReviewed: {
    type: Boolean,
    default: false
  },
  sellerReviewed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
