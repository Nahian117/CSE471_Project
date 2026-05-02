const Dispute = require('../models/Dispute');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const FCM = require('../utils/fcm');

exports.createDispute = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    const userId = req.userId;

    let evidence = [];
    if (req.files && req.files.length > 0) {
      evidence = req.files.map(file => `/uploads/${file.filename}`);
    } else if (req.body.evidence) {
      evidence = Array.isArray(req.body.evidence) ? req.body.evidence : [req.body.evidence];
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (transaction.buyer.toString() !== userId && transaction.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to dispute this transaction' });
    }

    if (transaction.status === 'completed' || transaction.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot dispute a completed or cancelled transaction' });
    }

    const dispute = new Dispute({
      transaction: transactionId,
      openedBy: userId,
      reason,
      evidence: evidence || []
    });

    await dispute.save();

    // Mark transaction as disputed
    transaction.status = 'disputed';
    await transaction.save();

    // In a real app, notify admin here via email or notification system.

    res.status(201).json({ message: 'Dispute opened successfully', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Error opening dispute', error: error.message });
  }
};

exports.getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('openedBy', 'name email')
      .populate({
        path: 'transaction',
        populate: [
          { path: 'buyer', select: 'name email' },
          { path: 'seller', select: 'name email' },
          { path: 'product', select: 'title price' }
        ]
      })
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching disputes', error: error.message });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;
    const adminId = req.userId;

    const dispute = await Dispute.findById(id).populate('transaction');
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    if (dispute.status !== 'open') {
      return res.status(400).json({ message: 'Dispute is already resolved' });
    }

    const transaction = dispute.transaction;
    const buyer = await User.findById(transaction.buyer);
    const seller = await User.findById(transaction.seller);

    if (decision === 'favor_buyer') {
      // Refund escrow to buyer
      if (transaction.fundsOnHold) {
        buyer.escrowBalance -= transaction.amount;
        buyer.walletBalance += transaction.amount;
        await buyer.save();
      }
      transaction.status = 'cancelled';
      transaction.fundsOnHold = false;
    } else if (decision === 'favor_seller') {
      // Release escrow to seller
      if (transaction.fundsOnHold) {
        buyer.escrowBalance -= transaction.amount;
        seller.walletBalance += transaction.amount;
        await buyer.save();
        await seller.save();
      }
      transaction.status = 'completed';
      transaction.fundsOnHold = false;
    } else if (decision === 'rejected') {
      // Revert transaction to payment_confirmed if funds are on hold
      transaction.status = transaction.fundsOnHold ? 'payment_confirmed' : 'accepted';
    }

    await transaction.save();

    dispute.status = decision === 'rejected' ? 'rejected' : 'resolved';
    dispute.resolution = {
      decision,
      notes,
      resolvedAt: new Date(),
      resolvedBy: adminId
    };

    await dispute.save();

    // FCM notifications
    const winner = decision === 'favor_buyer' ? buyer : seller;
    const loser  = decision === 'favor_buyer' ? seller : buyer;
    FCM.disputeResolved(winner, decision).catch(() => {});
    FCM.disputeResolved(loser,  decision).catch(() => {});

    res.json({ message: 'Dispute resolved successfully', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving dispute', error: error.message });
  }
};
