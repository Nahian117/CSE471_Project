const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // ── Core fields ─────────────────────────────────────────────────────────
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemType: {
    type: String,
    enum: ['Product', 'User'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },

  // ── Perspective API analysis ────────────────────────────────────────────
  toxicityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  perspectiveScores: {
    severeToxicity: { type: Number, default: 0 },
    insult:         { type: Number, default: 0 },
    threat:         { type: Number, default: 0 },
    identityAttack: { type: Number, default: 0 },
  },
  perspectiveAnalysed: {
    type: Boolean,
    default: false
  },

  // ── Auto-classification ─────────────────────────────────────────────────
  // 'valid'      → queued for admin review
  // 'suspicious' → borderline, flagged for admin with high priority
  // 'spam'       → auto-rejected
  classification: {
    type: String,
    enum: ['valid', 'suspicious', 'spam', 'unclassified'],
    default: 'unclassified'
  },

  // ── Workflow status ─────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'flagged', 'rejected', 'resolved', 'dismissed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },

  // ── Admin review ────────────────────────────────────────────────────────
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },

}, { timestamps: true });

// Index for fast duplicate-detection and admin queries
reportSchema.index({ reporter: 1, itemId: 1, status: 1 });
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
