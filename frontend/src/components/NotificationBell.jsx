import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * NotificationBell
 *
 * Props:
 *   onApplyFilter(filters) - called when user clicks "Apply" on a filter_match notification
 */
const NotificationBell = ({ onApplyFilter }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, { headers });
      setNotifications(res.data);
      setUnread(res.data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token]); // eslint-disable-line

  // Poll every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/mark-all-read`, {}, { headers });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/notifications/${id}`, { headers });
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await axios.put(`${API_URL}/api/notifications/${notif._id}/read`, {}, { headers });
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
      } catch {}
    }
    // If it's a filter match, navigate to browse with those filters
    if (notif.type === 'filter_match' && notif.product) {
      const prod = notif.product;
      onApplyFilter?.({
        category: prod.category || '',
        condition: prod.condition || ''
      });
      setOpen(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const iconFor = (type) => {
    if (type === 'filter_match')      return '🔔';
    if (type === 'pickup_reminder')   return '⏰';
    if (type === 'pickup_confirmed')  return '✅';
    if (type === 'pickup_cancelled')  return '❌';
    return '📢';
  };

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          background: open ? '#1a1830' : 'transparent',
          border: `1px solid ${open ? '#534AB7' : '#2a2a2a'}`,
          borderRadius: '10px',
          color: '#AFA9EC',
          padding: '7px 12px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.15s'
        }}
        title="Notifications"
        id="notification-bell-btn"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#e53e3e',
            color: '#fff',
            borderRadius: '50%',
            fontSize: '10px',
            fontWeight: 700,
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '2px solid #0f0f0f'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '320px',
          background: '#141420',
          border: '1px solid #2f2f44',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'notifSlideIn 0.15s ease'
        }}>
          <style>{`
            @keyframes notifSlideIn {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #2f2f44'
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
              Notifications {unread > 0 && (
                <span style={{
                  background: '#534AB7',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '11px',
                  padding: '1px 8px',
                  marginLeft: '6px'
                }}>{unread} new</span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#AFA9EC',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#555',
                fontSize: '13px'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔕</div>
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #1e1e30',
                    cursor: 'pointer',
                    background: notif.isRead ? 'transparent' : '#1a1830',
                    transition: 'background 0.15s',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1f1f35'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? 'transparent' : '#1a1830'}
                >
                  {/* Icon */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#2a1f5e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    {iconFor(notif.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 2px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: notif.isRead ? 400 : 700,
                      lineHeight: 1.4
                    }}>
                      {notif.title}
                    </p>
                    <p style={{
                      margin: '0 0 4px',
                      color: '#888',
                      fontSize: '11px',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {notif.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#444', fontSize: '10px' }}>{timeAgo(notif.createdAt)}</span>
                      {notif.type === 'filter_match' && (
                        <span style={{ color: '#AFA9EC', fontSize: '10px', fontWeight: 600 }}>
                          View →
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete X */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotification(notif._id); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#444',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '0 2px',
                      flexShrink: 0,
                      lineHeight: 1
                    }}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
