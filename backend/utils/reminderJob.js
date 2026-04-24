const cron = require('node-cron');
const Message = require('../models/Message');
const User = require('../models/User');

// Known BRACU campus locations (keywords)
const CAMPUS_LOCATIONS = [
  'ub', 'ab', 'mb', 'library', 'cafeteria', 'auditorium',
  'academic building', 'university building', 'main building',
  'bracu', 'brac university', 'campus', 'lab', 'ground floor',
  'canteen', 'rooftop', 'parking', 'gate'
];

/**
 * Determine reminder lead time based on pickup location and user's preferred location.
 *
 * Rules:
 *  - Same location as preferred  → 1 hour before
 *  - Different campus location   → 1.5 hours before
 *  - Off-campus / unknown        → 2 hours before
 */
const getReminderLeadTimeMs = (pickupLocation, preferredLocation) => {
  const pl = (pickupLocation || '').toLowerCase();
  const pref = (preferredLocation || '').toLowerCase();

  const isOnCampus = CAMPUS_LOCATIONS.some(kw => pl.includes(kw));

  if (pref && pl && pl === pref) {
    // Exact same preferred location
    return 1 * 60 * 60 * 1000; // 1 hour
  } else if (isOnCampus) {
    // Different but still on campus
    return 1.5 * 60 * 60 * 1000; // 1.5 hours
  } else {
    // Off-campus or unknown
    return 2 * 60 * 60 * 1000; // 2 hours
  }
};

const formatPickupTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Runs every minute.
 * Finds confirmed pickups whose reminder window has arrived and injects
 * a system reminder message into the conversation.
 */
const startReminderJob = () => {
  console.log('[ReminderJob] Started — checking every minute for upcoming pickups');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find all pickup messages that are confirmed and reminder not yet sent
      const pickupMessages = await Message.find({
        messageType: 'pickup',
        pickupStatus: 'confirmed',
        pickupTime: { $gt: now }, // pickup hasn't happened yet
        reminderSent: false
      }).populate('sender', 'name preferredPickupLocation')
        .populate('receiver', 'name preferredPickupLocation');

      for (const msg of pickupMessages) {
        const pickupTimeMs = new Date(msg.pickupTime).getTime();

        // Calculate reminder lead time for both buyer and seller
        // Use the receiver's preferred location (typically the buyer)
        const receiverPref = msg.receiver?.preferredPickupLocation || '';
        const leadTimeMs = getReminderLeadTimeMs(msg.pickupLocation, receiverPref);
        const reminderAt = pickupTimeMs - leadTimeMs;

        if (now.getTime() >= reminderAt) {
          // Time to send the reminder — inject a system message into the chat
          const timeUntil = Math.round((pickupTimeMs - now.getTime()) / (60 * 1000));
          const locationLabel = msg.pickupLocation || 'the agreed location';

          const reminderContent =
            `⏰ Pickup Reminder: You have a scheduled pickup in ~${timeUntil} minute${timeUntil !== 1 ? 's' : ''}.\n` +
            `📍 Location: ${locationLabel}\n` +
            `🕐 Time: ${formatPickupTime(msg.pickupTime)}`;

          await Message.create({
            sender: msg.sender._id,
            receiver: msg.receiver._id,
            product: msg.product,
            content: reminderContent,
            messageType: 'reminder',
            isRead: false
          });

          // Mark reminder as sent
          msg.reminderSent = true;
          msg.reminderSentAt = now;
          await msg.save();

          console.log(
            `[ReminderJob] Reminder sent for pickup at ${formatPickupTime(msg.pickupTime)} ` +
            `→ ${msg.receiver?.name} (lead: ${leadTimeMs / 3600000}h, location: ${msg.pickupLocation})`
          );
        }
      }
    } catch (err) {
      console.error('[ReminderJob] Error:', err.message);
    }
  });
};

module.exports = { startReminderJob, getReminderLeadTimeMs, CAMPUS_LOCATIONS };
