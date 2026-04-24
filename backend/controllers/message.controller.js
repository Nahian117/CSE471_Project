const Message = require('../models/Message');
const User = require('../models/User');
const { getReminderLeadTimeMs, CAMPUS_LOCATIONS } = require('../utils/reminderJob');

// Send message
const sendMessage = async (req, res) => {
  try {
    const { receiver, product, content, pickupTime, pickupLocation } = req.body;
    const sender = req.user._id;

    const message = new Message({
      sender,
      receiver,
      product,
      content,
      pickupTime,
      pickupLocation,
      messageType: 'text'
    });

    await message.save();
    res.status(201).json({ message: 'Message sent', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get conversation messages
const getMessages = async (req, res) => {
  try {
    const { productId, otherUserId } = req.params;
    const userId = req.user._id;

    const messages = await Message.find({
      product: productId,
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { receiver: userId, sender: otherUserId, product: productId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Block user
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blocker = req.user._id;

    await Message.updateMany(
      { $or: [{ sender: blocker, receiver: userId }, { sender: userId, receiver: blocker }] },
      { isBlocked: true }
    );

    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Report message
const reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.isReported = true;
    message.reportReason = reason;
    await message.save();

    res.json({ message: 'Message reported' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Schedule pickup — proposes a pickup time/location, inserts a pickup message into chat
const schedulePickup = async (req, res) => {
  try {
    const { receiver, product, pickupTime, pickupLocation } = req.body;
    const sender = req.user._id;

    if (!receiver || !product || !pickupTime || !pickupLocation) {
      return res.status(400).json({ message: 'receiver, product, pickupTime and pickupLocation are required' });
    }

    // Get sender's preferred location to show lead time info
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);
    const leadTimeMs = getReminderLeadTimeMs(pickupLocation, receiverUser?.preferredPickupLocation || '');
    const leadTimeHours = leadTimeMs / 3600000;

    const isOnCampus = CAMPUS_LOCATIONS.some(kw => (pickupLocation || '').toLowerCase().includes(kw));
    const locationTag = isOnCampus ? '🏫 On Campus' : '📍 Off Campus';

    const content =
      `📦 Pickup Proposed\n` +
      `📍 Location: ${pickupLocation} (${locationTag})\n` +
      `🕐 Time: ${new Date(pickupTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
      `⏰ Reminder will be sent ${leadTimeHours}h before pickup`;

    const pickupMessage = await Message.create({
      sender,
      receiver,
      product,
      content,
      messageType: 'pickup',
      pickupTime: new Date(pickupTime),
      pickupLocation,
      pickupStatus: 'proposed'
    });

    res.status(201).json({
      message: 'Pickup proposed',
      data: pickupMessage,
      reminderLeadHours: leadTimeHours,
      locationTag
    });
  } catch (error) {
    console.error('schedulePickup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Confirm pickup — receiver accepts the proposed pickup
const confirmPickup = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Pickup message not found' });
    if (msg.messageType !== 'pickup') return res.status(400).json({ message: 'Not a pickup message' });

    // Only the receiver can confirm
    if (msg.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the receiver can confirm the pickup' });
    }

    msg.pickupStatus = 'confirmed';
    await msg.save();

    // Insert a confirmation system message
    await Message.create({
      sender: userId,
      receiver: msg.sender,
      product: msg.product,
      content: `✅ Pickup confirmed for ${new Date(msg.pickupTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} at ${msg.pickupLocation}`,
      messageType: 'text'
    });

    res.json({ message: 'Pickup confirmed', data: msg });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel pickup
const cancelPickup = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Pickup message not found' });
    if (msg.messageType !== 'pickup') return res.status(400).json({ message: 'Not a pickup message' });

    if (msg.sender.toString() !== userId.toString() && msg.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    msg.pickupStatus = 'cancelled';
    await msg.save();

    // Insert a cancellation system message
    await Message.create({
      sender: userId,
      receiver: msg.sender.toString() === userId.toString() ? msg.receiver : msg.sender,
      product: msg.product,
      content: `❌ Pickup cancelled`,
      messageType: 'text'
    });

    res.json({ message: 'Pickup cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get active pickups for a conversation
const getActivePickups = async (req, res) => {
  try {
    const { productId, otherUserId } = req.params;
    const userId = req.user._id;

    const pickups = await Message.find({
      product: productId,
      messageType: 'pickup',
      pickupStatus: { $in: ['proposed', 'confirmed'] },
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: -1 });

    res.json(pickups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user's preferred pickup location
const setPreferredLocation = async (req, res) => {
  try {
    const { location } = req.body;
    await User.findByIdAndUpdate(req.user._id, { preferredPickupLocation: location });
    res.json({ message: 'Preferred pickup location updated', location });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get preferred pickup location
const getPreferredLocation = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferredPickupLocation');
    res.json({ preferredPickupLocation: user?.preferredPickupLocation || '' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all conversations for the logged-in user (inbox)
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all messages involving this user, group by product+otherUser
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
      isBlocked: false,
      messageType: { $in: ['text', 'pickup'] }
    })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate('product', 'title price images')
      .sort({ createdAt: -1 });

    // Build unique conversations map: key = productId_otherUserId
    const convMap = new Map();
    for (const msg of messages) {
      if (!msg.product) continue;
      const otherUser = msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;
      const key = `${msg.product._id}_${otherUser._id}`;
      if (!convMap.has(key)) {
        convMap.set(key, {
          product: msg.product,
          otherUser,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        });
      }
      // Count unread messages sent TO this user
      if (msg.receiver._id.toString() === userId.toString() && !msg.isRead) {
        convMap.get(key).unreadCount += 1;
      }
    }

    res.json(Array.from(convMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
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
};
