const Report   = require('../models/Report');
const Product  = require('../models/Product');
const User     = require('../models/User');
const TrustScore = require('../models/TrustScore');
const { analyseText, classifyReport } = require('../utils/perspective');
const FCM = require('../utils/fcm');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decrease a user's trust score by `delta` points when they submit spam reports.
 */
async function penaliseTrustScore(userId, delta = 5) {
  try {
    const ts = await TrustScore.findOne({ user: userId });
    if (ts) {
      ts.score = Math.max(0, ts.score - delta);
      await ts.save();
    }
  } catch (err) {
    console.error('[Report] Trust score penalty failed:', err.message);
  }
}

// ── Controller functions ───────────────────────────────────────────────────

/**
 * POST /api/reports
 * Create a report, run Perspective API analysis, auto-classify, and persist.
 */
exports.createReport = async (req, res) => {
  try {
    const { itemType, itemId, reason, description = '' } = req.body;
    const reporterId = req.userId;

    if (!['Product', 'User'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid item type. Must be "Product" or "User".' });
    }
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ message: 'Please provide a reason (min 5 characters).' });
    }

    // Verify the target exists
    if (itemType === 'Product') {
      const product = await Product.findById(itemId);
      if (!product) return res.status(404).json({ message: 'Product not found.' });
    } else {
      const target = await User.findById(itemId);
      if (!target) return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent duplicate pending reports from the same reporter
    const existing = await Report.findOne({ reporter: reporterId, itemId, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending report for this item.' });
    }

    // ── Perspective API analysis ───────────────────────────────────────────
    const textToAnalyse = [reason, description].filter(Boolean).join('\n').trim();
    let toxicityScore = 0, spamScore = 0, perspectiveScores = {}, perspectiveAnalysed = false;

    try {
      const result = await analyseText(textToAnalyse);
      toxicityScore       = result.toxicityScore || 0;
      spamScore           = result.spamScore     || 0;
      perspectiveScores   = {
        severeToxicity: result.severeToxicity || 0,
        insult:         result.insult         || 0,
        threat:         result.threat         || 0,
        identityAttack: result.identityAttack || 0,
      };
      perspectiveAnalysed = !result.error;
    } catch (apiErr) {
      console.warn('[Report] Perspective API unavailable — proceeding with manual review.');
    }
    // ──────────────────────────────────────────────────────────────────────

    const classification = classifyReport(toxicityScore, spamScore);

    // Determine initial status and priority based on classification
    let status   = 'pending';
    let priority = 'normal';

    if (classification === 'spam') {
      status   = 'rejected';   // Auto-reject toxic/spam reports
      priority = 'low';
    } else if (classification === 'suspicious') {
      status   = 'flagged';    // Flag for urgent admin review
      priority = 'high';
    }

    // Save report
    const report = new Report({
      reporter: reporterId,
      itemType,
      itemId,
      reason:   reason.trim(),
      description: description.trim(),
      toxicityScore,
      spamScore,
      perspectiveScores,
      perspectiveAnalysed,
      classification,
      status,
      priority,
    });

    await report.save();

    // ── Post-save side-effects ─────────────────────────────────────────────

    if (classification === 'spam') {
      // Penalise reporter trust score for abusive reports
      await penaliseTrustScore(reporterId, 10);
      return res.status(201).json({
        message: 'Your report was flagged as spam/abusive and rejected automatically.',
        classification,
        toxicityScore: parseFloat(toxicityScore.toFixed(3)),
        report: { id: report._id, status, classification }
      });
    }

    // Notify admins via FCM for valid/suspicious reports
    try {
      const admins = await User.find({ role: 'admin', fcmToken: { $ne: null } });
      for (const admin of admins) {
        await FCM.send(
          admin.fcmToken,
          classification === 'suspicious' ? '🚨 Suspicious Report' : '📋 New Report',
          `A ${classification} report was submitted for a ${itemType.toLowerCase()}. Toxicity: ${(toxicityScore * 100).toFixed(0)}%`,
          { type: 'report', reportId: report._id.toString() }
        );
      }
    } catch (fcmErr) {
      /* non-critical — swallow FCM errors */
    }

    res.status(201).json({
      message: classification === 'suspicious'
        ? 'Report submitted. It has been flagged for priority admin review due to its content.'
        : 'Report submitted successfully. Thank you for keeping the community safe.',
      classification,
      toxicityScore: parseFloat(toxicityScore.toFixed(3)),
      report: { id: report._id, status, classification }
    });

  } catch (error) {
    console.error('[Report] createReport error:', error.message);
    res.status(500).json({ message: 'Error submitting report.', error: error.message });
  }
};

/**
 * GET /api/reports
 * Admin/moderator — list all reports sorted by priority then date.
 */
exports.getReports = async (req, res) => {
  try {
    const { status, classification, itemType } = req.query;
    const filter = {};
    if (status)         filter.status         = status;
    if (classification) filter.classification = classification;
    if (itemType)       filter.itemType       = itemType;

    const reports = await Report.find(filter)
      .populate('reporter',   'name email')
      .populate('reviewedBy', 'name email')
      .populate({
        path:   'itemId',
        select: 'name email title price description isActive isSuspended images'
      })
      .sort({ priority: -1, createdAt: -1 });  // high-priority first

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports.', error: error.message });
  }
};

/**
 * GET /api/reports/my
 * Current user — list their own submitted reports.
 */
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.userId })
      .populate({ path: 'itemId', select: 'title name email price' })
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your reports.', error: error.message });
  }
};

/**
 * GET /api/reports/:id
 * Admin/moderator — get a single report with full detail.
 */
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter',   'name email studentId')
      .populate('reviewedBy', 'name email')
      .populate({ path: 'itemId', select: 'name email title price description images isSuspended isActive' });

    if (!report) return res.status(404).json({ message: 'Report not found.' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report.', error: error.message });
  }
};

/**
 * PUT /api/reports/:id/review
 * Admin/moderator — update report status and add notes.
 */
exports.reviewReport = async (req, res) => {
  try {
    const { id }                  = req.params;
    const { status, adminNotes }  = req.body;
    const adminId                 = req.userId;

    const allowed = ['pending', 'flagged', 'rejected', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    const report = await Report.findById(id).populate('reporter');
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    report.status     = status;
    report.adminNotes = adminNotes || report.adminNotes;
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();
    await report.save();

    // Notify the reporter of the outcome
    if (report.reporter?.fcmToken && (status === 'resolved' || status === 'dismissed')) {
      await FCM.send(
        report.reporter.fcmToken,
        status === 'resolved' ? '✅ Report Resolved' : '📋 Report Closed',
        status === 'resolved'
          ? 'Your report has been reviewed and resolved by our moderation team.'
          : 'Your report has been reviewed and closed.',
        { type: 'report', status }
      ).catch(() => {});
    }

    res.json({ message: 'Report updated successfully.', report });
  } catch (error) {
    res.status(500).json({ message: 'Error reviewing report.', error: error.message });
  }
};

/**
 * GET /api/reports/stats
 * Admin — aggregate statistics for the dashboard.
 */
exports.getReportStats = async (req, res) => {
  try {
    const [total, byStatus, byClassification] = await Promise.all([
      Report.countDocuments(),
      Report.aggregate([{ $group: { _id: '$status',         count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: '$classification', count: { $sum: 1 } } }]),
    ]);

    const avgToxicity = await Report.aggregate([
      { $match: { perspectiveAnalysed: true } },
      { $group: { _id: null, avg: { $avg: '$toxicityScore' } } }
    ]);

    res.json({
      total,
      byStatus:         Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      byClassification: Object.fromEntries(byClassification.map(r => [r._id, r.count])),
      avgToxicityScore: parseFloat((avgToxicity[0]?.avg || 0).toFixed(3)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report stats.', error: error.message });
  }
};
