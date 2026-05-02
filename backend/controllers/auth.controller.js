const User = require('../models/User')
const jwt = require('jsonwebtoken')
const TrustScore = require('../models/TrustScore')
const { sendOTP } = require('../utils/email')
const Product = require('../models/Product')
const Transaction = require('../models/Transaction')
const Dispute = require('../models/Dispute')
const Report = require('../models/Report')
const { verifyStudentId } = require('../utils/visionOcr')
const path = require('path')
const FCM = require('../utils/fcm')

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentType: user.studentType || 'buyer',
  isEmailVerified: user.isEmailVerified,
  isStudentVerified: user.isStudentVerified,
  studentVerificationStatus: user.studentVerificationStatus,
  studentVerificationExpiry: user.studentVerificationExpiry || undefined,
  studentId: user.studentId || undefined
})

// REGISTER
const register = async (req, res) => {
    console.log('Register hit', req.body, req.headers['content-type']) 
  try {
    const { name, email, password, studentType } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const type = ['buyer', 'seller'].includes(studentType) ? studentType : 'buyer'

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const user = new User({ 
      name: normalizedName, 
      email: normalizedEmail, 
      password,
      studentType: type,
      emailOTP: otp,
      emailOTPExpiry: otpExpiry
    })
    await user.save()

    console.log(`\n[OTP GENERATED] ${normalizedEmail} -> ${otp} (valid 10 minutes)\n`)

    try {
      const trustScore = new TrustScore({
        user: user._id,
        accountCreatedAt: user.createdAt
      })
      await trustScore.save()
    } catch (tsErr) {
      console.log('TrustScore creation failed:', tsErr.message)
    }

    await sendOTP(normalizedEmail, otp)

    res.status(201).json({
      message: 'Registration successful. OTP generated and printed in the backend console.',
      otp,
      user: buildUserPayload(user)
    })
  } catch (err) {
    console.error('REGISTER ERROR', err)
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' })
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message)
      return res.status(400).json({ message: messages[0] })
    }
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@g.bracu.ac.bd').toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123'

    // Admin login — check against stored hash (admin was created with hashed password)
    if (normalizedEmail === adminEmail) {
      let adminUser = await User.findOne({ email: normalizedEmail })
      if (!adminUser) {
        // First time: create admin with hashed password via pre('save')
        adminUser = new User({
          name: 'Administrator',
          email: normalizedEmail,
          password: adminPassword,
          role: 'admin',
          isEmailVerified: true
        })
        await adminUser.save()
      }
      // Verify password using bcrypt
      const isAdminMatch = await adminUser.comparePassword(password)
      if (!isAdminMatch) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }
      // Ensure admin role is set
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin'
        adminUser.isEmailVerified = true
        await adminUser.save()
      }
      const token = generateToken(adminUser._id, adminUser.role)
      return res.json({
        message: 'Admin login successful',
        token,
        user: buildUserPayload(adminUser)
      })
    }

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email first' })
    }

    const token = generateToken(user._id, user.role)

    res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// GET PROFILE
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -emailOTP -emailOTPExpiry')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(buildUserPayload(user))
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// VERIFY OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' })
    }

    if (user.emailOTP !== otp || user.emailOTPExpiry < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' })
    }

    user.isEmailVerified = true
    user.emailOTP = undefined
    user.emailOTPExpiry = undefined
    await user.save()

    const token = generateToken(user._id, user.role)

    res.json({
      message: 'Email verified successfully',
      token,
      user: buildUserPayload(user)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const uploadStudentId = async (req, res) => {
  console.log('[uploadStudentId] Called. file:', req.file?.originalname, '| body keys:', Object.keys(req.body));
  try {
    const { studentId, studentType } = req.body;

    let studentIdImage = req.body.studentIdImage;
    let localImagePath = null;
    if (req.file) {
      studentIdImage = `/uploads/${req.file.filename}`;
      localImagePath = req.file.path;
    }

    if (!studentId || !studentIdImage) {
      return res.status(400).json({ message: 'Student ID number and image are required' })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.studentId = studentId.trim()
    user.studentType = ['buyer', 'seller'].includes(studentType) ? studentType : user.studentType
    user.studentIdImage = studentIdImage
    user.studentVerificationStatus = 'pending'
    user.isStudentVerified = false

    // ── Google Cloud Vision OCR ──────────────────────────────────────
    let ocrMessage = 'Student ID uploaded. Awaiting admin approval.';
    if (localImagePath) {
      try {
        const { extractedText, confidence, status } = await verifyStudentId(
          localImagePath,
          studentId.trim(),
          user.name
        );

        user.ocrExtractedText = extractedText;
        user.ocrConfidence    = confidence;
        user.ocrVerificationStatus = status;
        user.ocrProcessedAt   = new Date();

        if (status === 'auto_verified') {
          // Auto-approve — mark as verified immediately
          user.studentVerificationStatus = 'approved';
          user.isStudentVerified = true;
          user.studentVerificationExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          ocrMessage = `Student ID auto-verified successfully! (Confidence: ${confidence}%)`;
        } else if (status === 'auto_failed') {
          // Keep as pending but flag low confidence
          ocrMessage = `OCR could not match your ID (confidence: ${confidence}%). Sent for manual admin review.`;
        } else {
          // pending_manual — partial match
          ocrMessage = `OCR found a partial match (confidence: ${confidence}%). An admin will review your submission.`;
        }
      } catch (ocrErr) {
        console.error('[OCR] Failed to process image:', ocrErr.message);
        // OCR failed — fall back to manual review silently
        user.ocrVerificationStatus = 'pending_manual';
        ocrMessage = 'Student ID uploaded. Awaiting admin approval.';
      }
    }
    // ────────────────────────────────────────────────────────────────

    await user.save()

    res.json({
      message: ocrMessage,
      ocrStatus: user.ocrVerificationStatus,
      ocrConfidence: user.ocrConfidence,
      user: buildUserPayload(user)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getPendingStudentVerifications = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      studentVerificationStatus: { $in: ['pending'] }
    }).select('name email studentId studentIdImage studentVerificationStatus ocrExtractedText ocrVerificationStatus ocrConfidence ocrProcessedAt')

    res.json(pendingUsers)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const approveStudentVerification = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.studentVerificationStatus = 'approved'
    user.isStudentVerified = true
    user.studentVerificationExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    await user.save()

    // FCM push notification
    FCM.studentVerification(user, true).catch(() => {});

    res.json({
      message: 'Student ID verified successfully',
      user: buildUserPayload(user)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const requireStudentRenewal = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.studentVerificationStatus = 'renewal-required'
    user.isStudentVerified = false
    user.studentVerificationExpiry = undefined
    await user.save()

    res.json({
      message: 'Student verification set to renewal required',
      user: buildUserPayload(user)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role studentType studentVerificationStatus studentId isStudentVerified studentVerificationExpiry isSuspended')

    res.json(users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentType: user.studentType || 'buyer',
      studentVerificationStatus: user.studentVerificationStatus,
      studentId: user.studentId || undefined,
      isStudentVerified: user.isStudentVerified,
      studentVerificationExpiry: user.studentVerificationExpiry || undefined,
      isSuspended: user.isSuspended || false
    })))
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body

    if (!['student', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.role = role
    await user.save()

    res.json({
      message: 'User role updated successfully',
      user: buildUserPayload(user)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const roleHome = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    let content = {
      title: 'Welcome',
      message: 'Welcome to your dashboard.'
    }

    if (user.role === 'admin') {
      content = {
        title: 'Admin Home',
        message: 'Manage users, approvals, and site settings.'
      }
    } else if (user.role === 'moderator') {
      content = {
        title: 'Moderator Home',
        message: 'Review reports, moderate content, and assist admins.'
      }
    } else {
      content = {
        title: `${user.studentType === 'seller' ? 'Seller' : 'Buyer'} Home`,
        message: user.studentType === 'seller'
          ? 'List items, manage orders, and grow your marketplace presence.'
          : 'Browse listings, make purchases, and build trust in the community.'
      }
    }

    res.json({
      user: buildUserPayload(user),
      home: content
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const toggleUserSuspension = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot suspend an admin' });
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    // FCM push notification
    FCM.accountStatus(user, user.isSuspended).catch(() => {});

    res.json({
      message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
      isSuspended: user.isSuspended
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

const getSystemAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeListings = await Product.countDocuments({ isActive: true });
    const completedTransactions = await Transaction.countDocuments({ status: 'completed' });
    const totalTransactions = await Transaction.countDocuments();
    const openDisputes = await Dispute.countDocuments({ status: 'open' });
    
    // Revenue or Total Escrowed could also be calculated
    const transactions = await Transaction.find({ status: 'completed' });
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

    const universityWiseActivity = await Product.aggregate([
      { $group: { _id: "$university", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalFraudReports = await Report.countDocuments();

    res.json({
      totalUsers,
      activeListings,
      completedTransactions,
      totalTransactions,
      openDisputes,
      totalVolume,
      universityWiseActivity,
      totalFraudReports
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

const saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'FCM token is required' });
    const user = await User.findByIdAndUpdate(
      req.userId,
      { fcmToken: token },
      { new: true }
    );
    res.json({ message: 'FCM token saved', fcmToken: user.fcmToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateNotificationPrefs = async (req, res) => {
  try {
    const { transactions, disputes, wishlist, adminActions } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (transactions  !== undefined) user.notificationPreferences.transactions  = transactions;
    if (disputes      !== undefined) user.notificationPreferences.disputes      = disputes;
    if (wishlist      !== undefined) user.notificationPreferences.wishlist      = wishlist;
    if (adminActions  !== undefined) user.notificationPreferences.adminActions  = adminActions;
    await user.save();
    res.json({ message: 'Preferences updated', preferences: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { register, login, getProfile, verifyOTP, uploadStudentId, getPendingStudentVerifications, approveStudentVerification, requireStudentRenewal, roleHome, getAllUsers, updateUserRole, toggleUserSuspension, getSystemAnalytics, saveFcmToken, updateNotificationPrefs }