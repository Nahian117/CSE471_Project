const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/dispute.controller');
const { protect, adminOnly, moderatorOrAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect);

router.post('/', upload.array('evidence', 5), disputeController.createDispute);
router.get('/', moderatorOrAdmin, disputeController.getAllDisputes);
router.put('/:id/resolve', moderatorOrAdmin, disputeController.resolveDispute);

module.exports = router;
