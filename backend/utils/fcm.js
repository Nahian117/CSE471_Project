const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ── Initialise Firebase Admin (once) ────────────────────────────────────────
let initialised = false;

function initFirebase() {
  if (initialised) return;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // JSON string in env (good for cloud deployments)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Path to JSON key file
      const keyPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.join(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH.replace(/^\.\//, ''));

      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else {
        console.warn('[FCM] Service account key file not found at:', keyPath);
        return;
      }
    } else {
      console.warn('[FCM] No Firebase credentials configured. Push notifications will be skipped.');
      return;
    }

    initialised = true;
    console.log('[FCM] Firebase Admin initialised successfully.');
  } catch (err) {
    console.error('[FCM] Failed to initialise Firebase Admin:', err.message);
  }
}

// Call once at module load
initFirebase();

/**
 * Send a push notification to one or more FCM device tokens.
 *
 * @param {string|string[]} tokens   FCM registration token(s)
 * @param {string}          title    Notification title
 * @param {string}          body     Notification body text
 * @param {object}          data     Optional key-value data payload
 * @returns {Promise<void>}
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!initialised) {
    console.log(`[FCM] (skipped — not initialised) "${title}": ${body}`);
    return;
  }

  const tokenList = Array.isArray(tokens) ? tokens.filter(Boolean) : [tokens].filter(Boolean);
  if (tokenList.length === 0) return;

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens: tokenList,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Sent "${title}" to ${response.successCount}/${tokenList.length} devices.`);

    // Log failures for debugging
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.warn(`[FCM] Token[${i}] failed:`, r.error?.message);
      }
    });
  } catch (err) {
    console.error('[FCM] sendPushNotification error:', err.message);
  }
}

/**
 * Convenience wrappers for common notification events.
 */
const FCM = {
  /**
   * Notify a user about a transaction status change.
   */
  async transactionUpdate(user, status, productTitle) {
    if (!user?.fcmToken) return;
    const labels = {
      accepted:          { title: '✅ Request Accepted',      body: `Your purchase request for "${productTitle}" was accepted. Proceed to payment.` },
      payment_confirmed: { title: '🔒 Payment Confirmed',     body: `Your payment for "${productTitle}" is held in escrow safely.` },
      completed:         { title: '🎉 Transaction Completed', body: `Your transaction for "${productTitle}" is complete! Funds have been released.` },
      cancelled:         { title: '❌ Transaction Cancelled', body: `The transaction for "${productTitle}" was cancelled.` },
      disputed:          { title: '⚠️ Dispute Opened',        body: `A dispute has been opened for "${productTitle}". Admin will review.` },
    };
    const n = labels[status];
    if (!n) return;
    await sendPushNotification(user.fcmToken, n.title, n.body, { type: 'transaction', status });
  },

  /**
   * Notify a user that their student ID was approved or rejected.
   */
  async studentVerification(user, approved) {
    if (!user?.fcmToken) return;
    const title = approved ? '🎓 Student Verified!' : '❌ Verification Rejected';
    const body  = approved
      ? 'Your student ID has been verified. You can now buy and sell on the marketplace!'
      : 'Your student ID verification was rejected. Please re-upload a clearer image.';
    await sendPushNotification(user.fcmToken, title, body, { type: 'verification' });
  },

  /**
   * Notify a user that their dispute was resolved.
   */
  async disputeResolved(user, decision) {
    if (!user?.fcmToken) return;
    const title = '⚖️ Dispute Resolved';
    const body  = decision === 'favor_buyer'
      ? 'The dispute was resolved in your favour. Funds have been returned.'
      : decision === 'favor_seller'
        ? 'The dispute was resolved. Funds have been released to the seller.'
        : 'The dispute was reviewed and rejected.';
    await sendPushNotification(user.fcmToken, title, body, { type: 'dispute', decision });
  },

  /**
   * Notify a user that their account was suspended or reinstated.
   */
  async accountStatus(user, suspended) {
    if (!user?.fcmToken) return;
    const title = suspended ? '🔴 Account Suspended'   : '🟢 Account Reinstated';
    const body  = suspended
      ? 'Your account has been suspended by an admin. Contact support for help.'
      : 'Your account suspension has been lifted. Welcome back!';
    await sendPushNotification(user.fcmToken, title, body, { type: 'account' });
  },

  /**
   * Notify a user that a wishlist-similar item was listed.
   */
  async wishlistMatch(user, productTitle, price) {
    if (!user?.fcmToken) return;
    await sendPushNotification(
      user.fcmToken,
      '❤️ Wishlist Match!',
      `An item similar to your wishlist is now listed: "${productTitle}" for ৳${price}`,
      { type: 'wishlist' }
    );
  },

  // Raw sender in case you need custom notifications
  send: sendPushNotification,
};

module.exports = FCM;
