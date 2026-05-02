import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Known BRACU campus locations for suggestions
const CAMPUS_LOCATIONS = [
  'UB (University Building)',
  'AB (Academic Building)',
  'MB (Main Building)',
  'Library',
  'Cafeteria',
  'Auditorium',
  'Rooftop',
  'Ground Floor Gate',
  'Parking Area',
];

const Chat = ({ product, productId, otherUserId, initialMessage = '' }) => {
  const [messages, setMessages]             = useState([]);
  const [newMessage, setNewMessage]         = useState(initialMessage);
  const [chatError, setChatError]           = useState('');

  // Pickup scheduling state
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupTime, setPickupTime]         = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [activePickup, setActivePickup]     = useState(null);
  const [preferredLocation, setPreferredLocation] = useState('');
  const [pickupLoading, setPickupLoading]   = useState(false);
  const [pickupMsg, setPickupMsg]           = useState('');

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');
  const currentUserId = (() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id || payload._id || null;
    } catch { return null; }
  })();

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!productId || !otherUserId) return;
    try {
      const res = await axios.get(`${API_URL}/api/messages/${productId}/${otherUserId}`, { headers: authHeaders });
      setMessages(res.data);
    } catch (err) {
      setChatError(err.response?.data?.message || 'Unable to load messages.');
    }
  }, [productId, otherUserId]);

  // ── Fetch active pickup ─────────────────────────────────────────────────────
  const fetchActivePickup = useCallback(async () => {
    if (!productId || !otherUserId) return;
    try {
      const res = await axios.get(`${API_URL}/api/messages/pickup/active/${productId}/${otherUserId}`, { headers: authHeaders });
      setActivePickup(res.data[0] || null);
    } catch {}
  }, [productId, otherUserId]);

  // ── Fetch preferred location ────────────────────────────────────────────────
  const fetchPreferredLocation = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/messages/preferred-location`, { headers: authHeaders });
      const pref = res.data.preferredPickupLocation || '';
      setPreferredLocation(pref);
      if (pref) setPickupLocation(pref); // auto-fill
    } catch {}
  }, []);

  useEffect(() => {
    if (productId && otherUserId) {
      fetchMessages();
      fetchActivePickup();
      fetchPreferredLocation();
    }
  }, [productId, otherUserId, fetchMessages, fetchActivePickup, fetchPreferredLocation]);

  // Poll every 5 seconds for new messages and reminder updates
  useEffect(() => {
    if (!productId || !otherUserId) return;
    const interval = setInterval(() => {
      fetchMessages();
      fetchActivePickup();
    }, 5000);
    return () => clearInterval(interval);
  }, [productId, otherUserId, fetchMessages, fetchActivePickup]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send initial message ────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!newMessage?.trim()) return;
    try {
      setChatError('');
      await axios.post(`${API_URL}/api/messages`, {
        receiver: otherUserId, product: productId, content: newMessage
      }, { headers: authHeaders });
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setChatError(err.response?.data?.message || 'Unable to send message.');
    }
  }, [newMessage, otherUserId, productId, fetchMessages]);

  // ── Schedule pickup ─────────────────────────────────────────────────────────
  const handleSchedulePickup = async () => {
    if (!pickupTime || !pickupLocation.trim()) {
      setPickupMsg('Please fill in both time and location.');
      return;
    }
    if (new Date(pickupTime) <= new Date()) {
      setPickupMsg('Pickup time must be in the future.');
      return;
    }
    setPickupLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/messages/pickup/schedule`, {
        receiver: otherUserId,
        product: productId,
        pickupTime,
        pickupLocation: pickupLocation.trim()
      }, { headers: authHeaders });

      setPickupMsg(`✅ Pickup proposed! Reminder will be sent ${res.data.reminderLeadHours}h before (${res.data.locationTag}).`);
      setShowPickupForm(false);
      setPickupTime('');
      await fetchMessages();
      await fetchActivePickup();

      // Save as preferred location
      await axios.post(`${API_URL}/api/messages/preferred-location`, { location: pickupLocation.trim() }, { headers: authHeaders });
      setPreferredLocation(pickupLocation.trim());

      setTimeout(() => setPickupMsg(''), 5000);
    } catch (err) {
      setPickupMsg(err.response?.data?.message || 'Failed to schedule pickup.');
    }
    setPickupLoading(false);
  };

  // ── Confirm pickup ──────────────────────────────────────────────────────────
  const handleConfirmPickup = async (messageId) => {
    try {
      await axios.put(`${API_URL}/api/messages/pickup/confirm/${messageId}`, {}, { headers: authHeaders });
      setPickupMsg('✅ Pickup confirmed!');
      await fetchMessages();
      await fetchActivePickup();
      setTimeout(() => setPickupMsg(''), 4000);
    } catch (err) {
      setPickupMsg(err.response?.data?.message || 'Failed to confirm pickup.');
    }
  };

  // ── Cancel pickup ───────────────────────────────────────────────────────────
  const handleCancelPickup = async (messageId) => {
    try {
      await axios.put(`${API_URL}/api/messages/pickup/cancel/${messageId}`, {}, { headers: authHeaders });
      setPickupMsg('Pickup cancelled.');
      await fetchMessages();
      await fetchActivePickup();
      setTimeout(() => setPickupMsg(''), 4000);
    } catch (err) {
      setPickupMsg(err.response?.data?.message || 'Failed to cancel pickup.');
    }
  };

  // ── Block / Report ──────────────────────────────────────────────────────────
  const blockUser = async () => {
    if (!window.confirm('Block this user?')) return;
    try {
      await axios.post(`${API_URL}/api/messages/block/${otherUserId}`, {}, { headers: authHeaders });
      setChatError('User blocked.');
      await fetchMessages();
    } catch (err) {
      setChatError(err.response?.data?.message || 'Unable to block user.');
    }
  };

  const reportMessage = async (messageId) => {
    const reason = window.prompt('Reason for reporting:');
    if (!reason) return;
    try {
      await axios.post(`${API_URL}/api/messages/report/${messageId}`, { reason }, { headers: authHeaders });
      alert('Message reported.');
    } catch {}
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    wrap:        { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f0f', fontFamily: "'Segoe UI', sans-serif", borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2a' },
    header:      { background: '#1a1a1a', padding: '14px 18px', borderBottom: '1px solid #2a2a2a' },
    msgList:     { flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '300px', maxHeight: '420px' },
    msgBubble:   (isMine, type) => ({
                   alignSelf: isMine ? 'flex-end' : 'flex-start',
                   maxWidth: '72%',
                   background: type === 'reminder' ? '#0f2a0f' : type === 'pickup' ? '#1a1a3a' : isMine ? '#534AB7' : '#1e1e1e',
                   border: type === 'reminder' ? '1px solid #2a5a2a' : type === 'pickup' ? '1px solid #3a3a7a' : 'none',
                   borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                   padding: '10px 14px',
                   color: '#fff', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-line'
                 }),
    pickupCard:  { background: '#1a1a3a', border: '1px solid #534AB7', borderRadius: '12px', padding: '14px 18px', margin: '12px 18px' },
    btn:         (color) => ({ background: color, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }),
    input:       { flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '13px', padding: '10px 14px', outline: 'none' },
    footer:      { background: '#1a1a1a', padding: '12px 18px', borderTop: '1px solid #2a2a2a' },
  };

  // ── Min-to-datetime string ───────────────────────────────────────────────────
  const minDateTime = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

  if (!productId || !otherUserId) {
    return (
      <div style={{ ...s.wrap, alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: '#555', fontSize: '14px' }}>Select a product and click "Chat to Buy" to start a conversation.</p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {/* ── Header ── */}
      <div style={s.header}>
        {product && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0 }}>{product.title}</p>
              <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0' }}>৳{product.price} · {product.seller?.name || 'Seller'}</p>
            </div>
            <button onClick={blockUser} style={{ ...s.btn('#2a1a1a'), border: '1px solid #A32D2D', color: '#F09595' }}>Block</button>
          </div>
        )}
      </div>

      {/* ── Active pickup banner ── */}
      {activePickup && (
        <div style={s.pickupCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <p style={{ color: '#AFA9EC', fontSize: '11px', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {activePickup.pickupStatus === 'confirmed' ? '✅ Confirmed Pickup' : '⏳ Pending Pickup'}
              </p>
              <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 2px' }}>
                📍 {activePickup.pickupLocation}
              </p>
              <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                🕐 {new Date(activePickup.pickupTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              {activePickup.pickupStatus === 'confirmed' && (
                <p style={{ color: '#6BCB77', fontSize: '11px', margin: '4px 0 0' }}>⏰ Auto-reminder will be sent before pickup</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {activePickup.pickupStatus === 'proposed' && (activePickup.receiver?._id?.toString() === currentUserId || activePickup.receiver?.toString() === currentUserId) && (
                <button onClick={() => handleConfirmPickup(activePickup._id)} style={s.btn('#0f3a1f')}>Confirm</button>
              )}
              <button onClick={() => handleCancelPickup(activePickup._id)} style={{ ...s.btn('#2a1a0f'), border: '1px solid #5a3a00', color: '#FFB347' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pickup status message ── */}
      {pickupMsg && (
        <div style={{ background: '#0f1a0f', border: '1px solid #2a4a2a', borderRadius: '8px', margin: '0 18px', padding: '8px 14px', color: '#6BCB77', fontSize: '12px' }}>
          {pickupMsg}
        </div>
      )}

      {/* ── Messages ── */}
      <div style={s.msgList}>
        {messages.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', margin: 'auto', fontSize: '13px' }}>No messages yet. Say hello!</p>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender?._id?.toString() === currentUserId?.toString() || msg.sender?.toString() === currentUserId?.toString();
            return (
              <div key={msg._id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <p style={{ color: '#555', fontSize: '11px', margin: '0 4px 2px' }}>{msg.sender?.name || 'You'}</p>
                <div style={s.msgBubble(isMine, msg.messageType)}>
                  {msg.content}
                  {/* Confirm/Cancel inline for pickup messages */}
                  {msg.messageType === 'pickup' && msg.pickupStatus === 'proposed' && !isMine && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button onClick={() => handleConfirmPickup(msg._id)} style={s.btn('#0f3a1f')}>Confirm</button>
                      <button onClick={() => handleCancelPickup(msg._id)} style={{ ...s.btn('transparent'), border: '1px solid #555', color: '#888' }}>Decline</button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 4px 0' }}>
                  <span style={{ color: '#333', fontSize: '10px' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.isRead && isMine && <span style={{ color: '#534AB7' }}> ✓✓</span>}
                  </span>
                  {!isMine && msg.messageType !== 'reminder' && (
                    <span onClick={() => reportMessage(msg._id)} style={{ color: '#555', fontSize: '10px', cursor: 'pointer' }}>Report</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        {chatError && <p style={{ color: '#F09595', fontSize: '12px', textAlign: 'center' }}>{chatError}</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Pickup scheduling form ── */}
      {showPickupForm && (
        <div style={{ background: '#111', borderTop: '1px solid #2a2a2a', padding: '14px 18px' }}>
          <p style={{ color: '#AFA9EC', fontSize: '12px', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' }}>Schedule Campus Pickup</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="datetime-local" value={pickupTime} min={minDateTime}
              onChange={e => setPickupTime(e.target.value)}
              style={{ ...s.input, fontSize: '13px' }} />
            <input list="campus-locations" value={pickupLocation}
              onChange={e => setPickupLocation(e.target.value)}
              placeholder="Pickup location (e.g. UB Ground Floor)"
              style={s.input} />
            <datalist id="campus-locations">
              {CAMPUS_LOCATIONS.map(l => <option key={l} value={l} />)}
            </datalist>
            {preferredLocation && (
              <p style={{ color: '#555', fontSize: '11px', margin: 0 }}>
                Your preferred location: <span style={{ color: '#AFA9EC', cursor: 'pointer' }} onClick={() => setPickupLocation(preferredLocation)}>{preferredLocation}</span> (click to use)
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSchedulePickup} disabled={pickupLoading} style={s.btn('#534AB7')}>
                {pickupLoading ? 'Proposing...' : 'Propose Pickup'}
              </button>
              <button onClick={() => setShowPickupForm(false)} style={{ ...s.btn('transparent'), border: '1px solid #333', color: '#666' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer: input + actions ── */}
      <div style={s.footer}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..." style={s.input} />
          <button onClick={() => sendMessage()} style={s.btn('#534AB7')}>Send</button>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setShowPickupForm(v => !v)}
            style={{ ...s.btn(showPickupForm ? '#1a1a3a' : '#111'), border: '1px solid #534AB7', color: '#AFA9EC', fontSize: '12px' }}>
            📦 {activePickup ? 'New Pickup' : 'Schedule Pickup'}
          </button>
          {activePickup?.pickupStatus === 'proposed' && (activePickup?.receiver?._id?.toString() === currentUserId || activePickup?.receiver?.toString() === currentUserId) && (
            <button onClick={() => handleConfirmPickup(activePickup._id)} style={{ ...s.btn('#0f3a1f'), border: '1px solid #2a4a2a', color: '#6BCB77', fontSize: '12px' }}>
              ✅ Confirm Pickup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
