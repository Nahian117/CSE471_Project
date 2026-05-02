const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  openedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  evidence: [{
    type: String // URLs or base64
  }],
  status: {
    type: String,
    enum: ['open', 'resolved', 'rejected'],
    default: 'open'
  },
  resolution: {
    decision: {
      type: String,
      enum: ['favor_buyer', 'favor_seller', 'partial_refund', 'rejected']
    },
    notes: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);
