const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const User = require('../models/User');
const SSLCommerzPayment = require('sslcommerz-lts');
const FCM = require('../utils/fcm');

const store_id = process.env.STORE_ID || 'testbox';
const store_passwd = process.env.STORE_PASS || 'qwerty';
const is_live = false;

exports.buyNow = async (req, res) => {
  console.log('[BuyNow] Hit — productId:', req.body.productId, '| userId:', req.userId);
  try {
    const { productId } = req.body;
    const buyerId = req.userId;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found or no longer available' });
    }

    if (product.seller.toString() === buyerId) {
      return res.status(400).json({ message: 'Cannot buy your own product' });
    }

    // Check for duplicate active transaction
    const existing = await Transaction.findOne({
      buyer: buyerId,
      product: productId,
      status: { $nin: ['cancelled', 'completed'] }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have an active transaction for this product.' });
    }

    const buyer = await User.findById(buyerId);

    // Create transaction in 'accepted' state — no seller approval needed
    const transaction = new Transaction({
      buyer: buyerId,
      seller: product.seller,
      product: productId,
      amount: product.price,
      status: 'accepted'
    });
    await transaction.save();

    // Immediately initiate SSLCommerz payment session
    const data = {
      total_amount: parseFloat(product.price),
      currency: 'BDT',
      tran_id: transaction._id.toString(),
      success_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-success`,
      fail_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-fail`,
      cancel_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-cancel`,
      ipn_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-ipn`,
      shipping_method: 'Courier',
      product_name: product.title || 'Marketplace Item',
      product_category: product.category || 'General',
      product_profile: 'general',
      cus_name: buyer.name,
      cus_email: buyer.email,
      cus_add1: 'Dhaka',
      cus_add2: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '01711111111',
      ship_name: buyer.name,
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data)
      .then(apiResponse => {
        console.log('[SSLCommerz] Response:', JSON.stringify(apiResponse, null, 2));
        if (!apiResponse.GatewayPageURL) {
          transaction.status = 'cancelled';
          transaction.save();
          return res.status(500).json({ 
            message: `Payment gateway failed: ${apiResponse.failedreason || apiResponse.status || 'Unknown error'}` 
          });
        }
        res.json({ gatewayUrl: apiResponse.GatewayPageURL });
      })
      .catch(async err => {
        console.error('[SSLCommerz] Init error:', err.message);
        transaction.status = 'cancelled';
        await transaction.save();
        res.status(500).json({ message: 'SSLCommerz init failed', error: err.message });
      });

  } catch (error) {
    res.status(500).json({ message: 'Error initiating purchase', error: error.message });
  }
};

exports.acceptTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.userId;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (transaction.seller.toString() !== sellerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (transaction.status !== 'request') {
      return res.status(400).json({ message: 'Can only accept transactions in request state' });
    }

    transaction.status = 'accepted';
    await transaction.save();

    res.json({ message: 'Transaction accepted', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting transaction', error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.userId;

    const transaction = await Transaction.findById(id).populate('buyer').populate('product');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (transaction.buyer._id.toString() !== buyerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (transaction.status !== 'accepted') {
      return res.status(400).json({ message: 'Transaction must be accepted by seller first' });
    }

    const data = {
      total_amount: transaction.amount,
      currency: 'BDT',
      tran_id: transaction._id.toString(),
      success_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-success`,
      fail_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-fail`,
      cancel_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-cancel`,
      ipn_url: `${process.env.API_URL || 'http://localhost:5000'}/api/transactions/ssl-payment-ipn`,
      shipping_method: 'Courier',
      product_name: transaction.product ? transaction.product.title : 'Marketplace Item',
      product_category: 'Electronic',
      product_profile: 'general',
      cus_name: transaction.buyer.name,
      cus_email: transaction.buyer.email,
      cus_add1: 'Dhaka',
      cus_add2: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '01711111111',
      ship_name: transaction.buyer.name,
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
    };
    
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then(apiResponse => {
      let GatewayPageURL = apiResponse.GatewayPageURL;
      res.json({ gatewayUrl: GatewayPageURL });
    }).catch(err => {
      res.status(500).json({ message: 'SSLCommerz init failed', error: err.message });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming payment', error: error.message });
  }
};

exports.sslSuccess = async (req, res) => {
  try {
    const { tran_id, val_id } = req.body;
    const transaction = await Transaction.findById(tran_id);
    if (!transaction) return res.status(404).send('Transaction not found');

    if (!val_id) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace?tab=transactions&payment=fail`);
    }

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.validate({ val_id }).then(async (data) => {
      if (data && (data.status === 'VALID' || data.status === 'VALIDATED')) {
        if (transaction.status === 'accepted') {
          const buyer = await User.findById(transaction.buyer);
          if (buyer) {
            buyer.escrowBalance = (buyer.escrowBalance || 0) + transaction.amount;
            await buyer.save();
          }

          transaction.status = 'payment_confirmed';
          transaction.fundsOnHold = true;
          await transaction.save();

          // Notify seller that payment is confirmed
          const seller = await User.findById(transaction.seller);
          const product = await Product.findById(transaction.product);
          FCM.transactionUpdate(seller, 'payment_confirmed', product?.title || 'item').catch(() => {});
        }
      }
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace?tab=transactions&payment=success`);
    }).catch(err => {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace?tab=transactions&payment=fail`);
    });

  } catch (err) {
    res.status(500).send('Server Error');
  }
};

exports.sslFail = async (req, res) => {
  try {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace?tab=transactions&payment=fail`);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

exports.sslCancel = async (req, res) => {
  try {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace?tab=transactions&payment=cancel`);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

exports.sslIpn = async (req, res) => {
  try {
    const { tran_id, status } = req.body;
    if (status === 'VALID') {
      const transaction = await Transaction.findById(tran_id);
      if (transaction && transaction.status === 'accepted') {
        const buyer = await User.findById(transaction.buyer);
        if (buyer) {
          buyer.escrowBalance = (buyer.escrowBalance || 0) + transaction.amount;
          await buyer.save();
        }

        transaction.status = 'payment_confirmed';
        transaction.fundsOnHold = true;
        await transaction.save();
      }
    }
    res.status(200).send('IPN Received');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.userId;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (transaction.buyer.toString() !== buyerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (transaction.status !== 'payment_confirmed') {
      return res.status(400).json({ message: 'Payment must be confirmed first' });
    }

    // Move funds from buyer's escrow to seller's wallet
    const buyer = await User.findById(buyerId);
    const seller = await User.findById(transaction.seller);

    if (buyer.escrowBalance >= transaction.amount) {
      buyer.escrowBalance -= transaction.amount;
      seller.walletBalance += transaction.amount;
      await buyer.save();
      await seller.save();
    }

    transaction.status = 'completed';
    transaction.fundsOnHold = false;
    await transaction.save();

    // Mark product as inactive/sold
    const product = await Product.findById(transaction.product);
    if (product) {
      product.isActive = false;
      await product.save();
    }

    // FCM — notify seller that funds have been released
    FCM.transactionUpdate(seller, 'completed', product?.title || 'item').catch(() => {});
    // FCM — notify buyer that transaction is complete
    FCM.send(buyer.fcmToken, '🎉 Transaction Complete', `Your purchase is complete. Thank you!`, { type: 'transaction' }).catch(() => {});

    res.json({ message: 'Delivery confirmed. Funds released to seller.', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming delivery', error: error.message });
  }
};

exports.cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    if (transaction.buyer.toString() !== userId && transaction.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (['completed', 'cancelled'].includes(transaction.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed or already cancelled transaction' });
    }

    // Refund if payment was made
    if (transaction.status === 'payment_confirmed' && transaction.fundsOnHold) {
      const buyer = await User.findById(transaction.buyer);
      if (buyer && buyer.escrowBalance >= transaction.amount) {
        buyer.escrowBalance -= transaction.amount;
        buyer.walletBalance += transaction.amount;
        await buyer.save();
      }
    }

    transaction.status = 'cancelled';
    transaction.fundsOnHold = false;
    await transaction.save();

    // FCM — notify both buyer and seller about cancellation
    const [txBuyer, txSeller, txProduct] = await Promise.all([
      User.findById(transaction.buyer),
      User.findById(transaction.seller),
      Product.findById(transaction.product)
    ]);
    FCM.transactionUpdate(txBuyer,  'cancelled', txProduct?.title || 'item').catch(() => {});
    FCM.transactionUpdate(txSeller, 'cancelled', txProduct?.title || 'item').catch(() => {});

    res.json({ message: 'Transaction cancelled', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling transaction', error: error.message });
  }
};

exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const transactions = await Transaction.find({
      $or: [{ buyer: userId }, { seller: userId }]
    })
    .populate('buyer', 'name email')
    .populate('seller', 'name email')
    .populate('product', 'title price images isActive')
    .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = req.userId;

    const allTransactions = await Transaction.find({
      $or: [{ buyer: userId }, { seller: userId }]
    });

    const pastPurchases = allTransactions.filter(t => t.buyer.toString() === userId && t.status === 'completed').length;
    const pastSales = allTransactions.filter(t => t.seller.toString() === userId && t.status === 'completed').length;
    
    const totalEarnings = allTransactions
      .filter(t => t.seller.toString() === userId && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const completedCount = allTransactions.filter(t => t.status === 'completed').length;
    const totalCount = allTransactions.length;
    const successRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : 0;

    res.json({
      pastPurchases,
      pastSales,
      totalEarnings,
      successRate: Number(successRate)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};
