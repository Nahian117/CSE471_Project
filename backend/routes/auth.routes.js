const express = require('express')
const router = express.Router()
const { register, login, getProfile, verifyOTP, uploadStudentId, getPendingStudentVerifications, approveStudentVerification, requireStudentRenewal, roleHome, getAllUsers, updateUserRole, toggleUserSuspension, getSystemAnalytics, saveFcmToken, updateNotificationPrefs } = require('../controllers/auth.controller')
const { protect, adminOnly, authorizeRoles } = require('../middleware/auth.middleware')
const upload = require('../middleware/upload.middleware')
const multer = require('multer')

router.post('/register', register)
router.post('/login', login)
router.post('/verify-otp', verifyOTP)
router.get('/profile', protect, getProfile)

// Multer-aware upload route — catches multer errors and returns JSON
router.post('/student-id-upload', protect, (req, res, next) => {
  upload.single('studentIdImage')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, uploadStudentId)

router.get('/home', protect, roleHome)
router.get('/admin/users', protect, adminOnly, getAllUsers)
router.post('/admin/users/:userId/role', protect, adminOnly, updateUserRole)
router.get('/admin/pending-student-verifications', protect, adminOnly, getPendingStudentVerifications)
router.post('/admin/approve-student/:userId', protect, adminOnly, approveStudentVerification)
router.post('/admin/require-student-renewal/:userId', protect, adminOnly, requireStudentRenewal)
router.post('/admin/users/:userId/suspend', protect, adminOnly, toggleUserSuspension)
router.get('/admin/analytics', protect, adminOnly, getSystemAnalytics)

// FCM notification routes
router.post('/fcm-token', protect, saveFcmToken)
router.put('/notification-preferences', protect, updateNotificationPrefs)

module.exports = router