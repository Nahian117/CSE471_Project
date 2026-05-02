const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth.middleware');

// Public SSLCommerz Callbacks (no auth needed — called by SSLCommerz server)
router.post('/ssl-payment-success', transactionController.sslSuccess);
router.post('/ssl-payment-fail', transactionController.sslFail);
router.post('/ssl-payment-cancel', transactionController.sslCancel);
router.post('/ssl-payment-ipn', transactionController.sslIpn);

// Protected routes
router.use(protect);

router.post('/buy-now', transactionController.buyNow);
router.get('/', transactionController.getUserTransactions);
router.get('/analytics', transactionController.getUserAnalytics);
router.put('/:id/deliver', transactionController.confirmDelivery);
router.put('/:id/cancel', transactionController.cancelTransaction);

module.exports = router;
