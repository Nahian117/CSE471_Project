const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  sendMessage,
  getMessages,
  getConversations,
  blockUser,
  reportMessage,
  schedulePickup,
  confirmPickup,
  cancelPickup,
  getActivePickups,
  setPreferredLocation,
  getPreferredLocation
} = require('../controllers/message.controller');

router.use(protect); // All message routes require authentication

router.post('/', sendMessage);
router.get('/conversations', getConversations);
router.get('/:productId/:otherUserId', getMessages);
router.post('/block/:userId', blockUser);
router.post('/report/:messageId', reportMessage);

// Pickup scheduling
router.post('/pickup/schedule', schedulePickup);
router.put('/pickup/confirm/:messageId', confirmPickup);
router.put('/pickup/cancel/:messageId', cancelPickup);
router.get('/pickup/active/:productId/:otherUserId', getActivePickups);

// Preferred location
router.post('/preferred-location', setPreferredLocation);
router.get('/preferred-location', getPreferredLocation);

module.exports = router;
