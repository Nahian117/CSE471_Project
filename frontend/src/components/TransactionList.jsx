import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TransactionList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TransactionList = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [disputingTx, setDisputingTx] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidenceFiles, setDisputeEvidenceFiles] = useState([]);
  const [disputeEvidencePreviews, setDisputeEvidencePreviews] = useState([]);
  
  const [reviewingTx, setReviewingTx] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const [res, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/api/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/transactions/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setTransactions(res.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // Poll every 10 seconds for updates
    const interval = setInterval(fetchTransactions, 10000);

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    if (paymentStatus) {
      if (paymentStatus === 'success') alert('Payment was successful! Funds are securely in escrow.');
      else if (paymentStatus === 'fail') alert('Payment failed. Please try again.');
      else if (paymentStatus === 'cancel') alert('Payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=transactions");
    }

    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/transactions/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (action === 'pay' && res.data.gatewayUrl) {
        window.location.href = res.data.gatewayUrl;
        return;
      }
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} transaction`);
    }
  };

  const submitDispute = async () => {
    if (!disputeReason.trim()) return alert('Please enter a reason');
    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      submitData.append('transactionId', disputingTx._id);
      submitData.append('reason', disputeReason);
      
      disputeEvidenceFiles.forEach(file => {
        submitData.append('evidence', file);
      });

      await axios.post(`${API_URL}/api/disputes`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Dispute opened successfully!');
      setDisputingTx(null);
      setDisputeReason('');
      setDisputeEvidenceFiles([]);
      setDisputeEvidencePreviews([]);
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to open dispute');
    }
  };

  const submitReview = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/reviews`, {
        transactionId: reviewingTx._id,
        rating,
        feedback
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Review submitted!');
      setReviewingTx(null);
      setRating(5);
      setFeedback('');
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="transaction-loading">Loading transactions...</div>;
  if (error) return <div className="transaction-error">{error}</div>;
  if (transactions.length === 0) return <div className="transaction-empty">No transactions found.</div>;

  return (
    <div className="transaction-list">
      {analytics && (
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '120px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Past Purchases</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{analytics.pastPurchases}</div>
          </div>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '120px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Past Sales</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{analytics.pastSales}</div>
          </div>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '120px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Total Earnings</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', color: '#5DCAA5' }}>৳{analytics.totalEarnings}</div>
          </div>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '120px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Success Rate</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', color: '#AFA9EC' }}>{analytics.successRate}%</div>
          </div>
        </div>
      )}

      {transactions.map(t => {
        const currentUserId = user?.id || user?._id;
        const buyerId = t.buyer?._id || t.buyer;
        const isBuyer = buyerId === currentUserId;
        const otherParty = isBuyer ? t.seller : t.buyer;
        
        return (
          <div key={t._id} className="transaction-card">
            <div className="transaction-header">
              <span className={`status-badge ${t.status}`}>{t.status.replace('_', ' ').toUpperCase()}</span>
              <span className="transaction-date">{new Date(t.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div className="transaction-body">
              <div className="product-info">
                {t.product?.images?.[0] ? (
                  <img src={t.product.images[0]} alt={t.product.title} />
                ) : (
                  <div className="placeholder-img">📦</div>
                )}
                <div>
                  <h4>{t.product?.title || 'Deleted Product'}</h4>
                  <p className="price">৳{t.amount}</p>
                </div>
              </div>
              
              <div className="party-info">
                <p><strong>{isBuyer ? 'Seller' : 'Buyer'}:</strong> {otherParty?.name || 'Unknown'}</p>
                {t.fundsOnHold && <span className="funds-hold-badge">Funds in Escrow</span>}
              </div>
            </div>

            <div className="transaction-actions">
              {/* Buyer confirms delivery after receiving item */}
              {isBuyer && t.status === 'payment_confirmed' && (
                <button className="btn-success" onClick={() => handleAction(t._id, 'deliver')}>✅ Confirm Delivery</button>
              )}

              {/* Cancel only if payment not yet confirmed */}
              {t.status === 'accepted' && (
                <button className="btn-danger" onClick={() => handleAction(t._id, 'cancel')}>Cancel</button>
              )}

              {/* Dispute Button */}
              {['payment_confirmed', 'accepted'].includes(t.status) && (
                <button className="btn-warning" onClick={() => setDisputingTx(t)}>⚠️ Open Dispute</button>
              )}

              {/* Review Button */}
              {t.status === 'completed' && (
                (isBuyer && !t.buyerReviewed) || (!isBuyer && !t.sellerReviewed)
              ) && (
                <button className="btn-primary" style={{ background: '#ec4899' }} onClick={() => setReviewingTx(t)}>⭐ Leave Review</button>
              )}
            </div>
          </div>
        );
      })}

      {disputingTx && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Open Dispute</h3>
            <p>Transaction ID: {disputingTx._id}</p>
            <textarea 
              placeholder="Explain the issue in detail..." 
              value={disputeReason} 
              onChange={e => setDisputeReason(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '10px', marginTop: '10px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
            />
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#ccc' }}>Evidence (Screenshots/Images):</label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setDisputeEvidenceFiles(files);
                  setDisputeEvidencePreviews(files.map(f => URL.createObjectURL(f)));
                }}
                style={{ color: '#fff', fontSize: '12px' }}
              />
              {disputeEvidencePreviews.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto' }}>
                  {disputeEvidencePreviews.map((src, i) => (
                    <img key={i} src={src} alt="evidence" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #444' }} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                setDisputingTx(null);
                setDisputeEvidenceFiles([]);
                setDisputeEvidencePreviews([]);
              }} className="btn-danger">Cancel</button>
              <button onClick={submitDispute} className="btn-warning">Submit Dispute</button>
            </div>
          </div>
        </div>
      )}

      {reviewingTx && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Leave a Review</h3>
            <div style={{ marginTop: '10px' }}>
              <label>Rating (1-5): </label>
              <select value={rating} onChange={e => setRating(Number(e.target.value))} style={{ padding: '5px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }}>
                <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                <option value={4}>⭐⭐⭐⭐ (4)</option>
                <option value={3}>⭐⭐⭐ (3)</option>
                <option value={2}>⭐⭐ (2)</option>
                <option value={1}>⭐ (1)</option>
              </select>
            </div>
            <textarea 
              placeholder="Optional written feedback..." 
              value={feedback} 
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px', marginTop: '15px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setReviewingTx(null)} className="btn-danger">Cancel</button>
              <button onClick={submitReview} className="btn-primary" style={{ background: '#ec4899' }}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
