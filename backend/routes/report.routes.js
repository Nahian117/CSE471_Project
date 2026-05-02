const express = require('express');
const router  = express.Router();
const reportController = require('../controllers/report.controller');
const { protect, moderatorOrAdmin } = require('../middleware/auth.middleware');

// ── User routes ─────────────────────────────────────────────────────────────
router.post('/',    protect, reportController.createReport);   // Submit a report
router.get('/my',   protect, reportController.getMyReports);   // Own reports

// ── Admin / Moderator routes ────────────────────────────────────────────────
router.get('/stats',     protect, moderatorOrAdmin, reportController.getReportStats);  // Aggregate stats
router.get('/',          protect, moderatorOrAdmin, reportController.getReports);      // All reports (filterable)
router.get('/:id',       protect, moderatorOrAdmin, reportController.getReportById);   // Single report
router.put('/:id/review',protect, moderatorOrAdmin, reportController.reviewReport);   // Update status

module.exports = router;
