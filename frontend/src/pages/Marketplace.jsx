import React, { useEffect } from 'react';
import axios from 'axios';
import { domainToLabel } from '../constants/universities';
import ProductList from '../components/ProductList';
import ProductForm from '../components/ProductForm';
import Chat from '../components/Chat';
import SavedFilters from '../components/SavedFilters';
import TransactionList from '../components/TransactionList';
import Wishlist from '../components/Wishlist';
import './Marketplace.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Marketplace = ({ user, externalFilter }) => {
  const [activeTab, setActiveTab]           = React.useState('browse');
  const [searchQuery, setSearchQuery]       = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');

  // University-based filter (Member-2 feature)
  const userDomain     = user?.email ? user.email.split('@')[1] : '';
  const userUniLabel   = domainToLabel(userDomain);  // e.g. 'BRAC University'
  const [uniFilterMode, setUniFilterMode] = React.useState('all'); // 'all' | 'mine'

  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [selectedChatUser, setSelectedChatUser] = React.useState(null);
  const [pendingMessage, setPendingMessage] = React.useState('');

  // Inbox state
  const [conversations, setConversations]   = React.useState([]);
  const [inboxLoading, setInboxLoading]     = React.useState(false);
  const [totalUnread, setTotalUnread]       = React.useState(0);

  const canSell = user?.studentType === 'seller';
  const quickCategories = ['electronics', 'books', 'clothing', 'furniture', 'sports'];
  const token = localStorage.getItem('token');

  // Fetch conversations (inbox)
  const fetchConversations = React.useCallback(async () => {
    if (!token) return;
    setInboxLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
      setTotalUnread(res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
    setInboxLoading(false);
  }, [token]);

  // Poll for new messages every 5 seconds
  React.useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const startChat = (product) => {
    const sellerId = product.seller?._id || product.seller || '000000000000000000000001';
    setSelectedProduct(product);
    setSelectedChatUser(sellerId);
    setPendingMessage('');
    setActiveTab('chat');
  };

  const openConversation = (conv) => {
    setSelectedProduct(conv.product);
    setSelectedChatUser(conv.otherUser._id);
    setPendingMessage('');
    setActiveTab('chat');
    setTimeout(fetchConversations, 1000);
  };

  /**
   * Called when the user clicks "Apply to Browse" on a saved filter
   * or clicks a filter_match notification.
   */
  const handleApplyFilter = React.useCallback((filters) => {
    if (filters.search    !== undefined) setSearchQuery(filters.search || '');
    if (filters.category  !== undefined) setCategoryFilter(filters.category || '');
    if (filters.university) setUniFilterMode('all');
    setAppliedFilters({
      category:   filters.category  || '',
      condition:  filters.condition || '',
      minPrice:   filters.minPrice  || '',
      maxPrice:   filters.maxPrice  || '',
      university: filters.university || '',
      search:     filters.search    || '',
    });
    setActiveTab('browse');
  }, []);

  // React to externally-pushed filters (from NotificationBell in App.js)
  useEffect(() => {
    if (externalFilter) handleApplyFilter(externalFilter);
  }, [externalFilter]); // eslint-disable-line

  const [appliedFilters, setAppliedFilters] = React.useState({});

  // Merge top-bar controls into initialFilters for ProductList
  const browseFilters = React.useMemo(() => ({
    search:     searchQuery,
    category:   categoryFilter,
    university: uniFilterMode === 'mine' ? userUniLabel : (appliedFilters.university || ''),
    condition:  appliedFilters.condition || '',
    minPrice:   appliedFilters.minPrice  || '',
    maxPrice:   appliedFilters.maxPrice  || '',
  }), [searchQuery, categoryFilter, uniFilterMode, userUniLabel, appliedFilters]);

  return (
    <div className="marketplace">
      <nav>
        <button onClick={() => setActiveTab('browse')}>Browse Products</button>
        {canSell && <button onClick={() => setActiveTab('sell')}>Sell Product</button>}
        {canSell && <button onClick={() => setActiveTab('mylistings')}>My Listings</button>}
        <button onClick={() => { setActiveTab('messages'); fetchConversations(); }} style={{ position: 'relative' }}>
          Messages
          {totalUnread > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              background: '#534AB7', color: '#fff', borderRadius: '50%',
              fontSize: '10px', fontWeight: 700, width: '18px', height: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('filters')}>Saved Filters</button>
        <button onClick={() => setActiveTab('wishlist')}>Wishlist</button>
        <button onClick={() => setActiveTab('transactions')}>Transactions</button>
      </nav>

      {activeTab === 'browse' && (
        <div className="market-search">
          <input
            type="text"
            placeholder="Search by title, description, or university"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* ── University-Based Filtering (Member-2) ── */}
          <div className="uni-filter-row">
            <span className="uni-filter-label">🎓 University:</span>
            <button
              className={`uni-pill ${uniFilterMode === 'all' ? 'active' : ''}`}
              onClick={() => setUniFilterMode('all')}
            >
              All Universities
            </button>
            <button
              className={`uni-pill ${uniFilterMode === 'mine' ? 'active' : ''}`}
              onClick={() => setUniFilterMode('mine')}
              title={`Show only listings from ${userUniLabel}`}
            >
              My Campus Only {userUniLabel ? `(${userUniLabel})` : ''}
            </button>
          </div>

          <div className="quick-categories">
            <span>Quick browse:</span>
            {quickCategories.map((category) => (
              <button
                key={category}
                className={categoryFilter === category ? 'active' : ''}
                onClick={() => setCategoryFilter(categoryFilter === category ? '' : category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="content">
        {activeTab === 'browse' && (
          <ProductList
            initialFilters={browseFilters}
            onChat={startChat}
          />
        )}
        {activeTab === 'sell' && canSell && (
          <ProductForm onSuccess={() => setActiveTab('mylistings')} />
        )}

        {/* ── My Listings ── */}
        {activeTab === 'mylistings' && canSell && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>📦 My Listings</h3>
              <button
                onClick={() => setActiveTab('sell')}
                style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                + Add New
              </button>
            </div>
            <ProductList sellerOnly={true} />
          </div>
        )}

        {/* ── Inbox ── */}
        {activeTab === 'messages' && (
          <div style={{ padding: '20px', fontFamily: "'Segoe UI', sans-serif" }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px' }}>
              Messages {totalUnread > 0 && <span style={{ background: '#534AB7', color: '#fff', borderRadius: '12px', fontSize: '12px', padding: '2px 10px', marginLeft: '8px' }}>{totalUnread} unread</span>}
            </h3>

            {inboxLoading && conversations.length === 0 && (
              <p style={{ color: '#555' }}>Loading conversations...</p>
            )}

            {!inboxLoading && conversations.length === 0 && (
              <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#555', margin: 0 }}>No conversations yet.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conversations.map((conv, i) => (
                <div key={i} onClick={() => openConversation(conv)}
                  style={{
                    background: conv.unreadCount > 0 ? '#1a1a2a' : '#1a1a1a',
                    border: `1px solid ${conv.unreadCount > 0 ? '#534AB7' : '#2a2a2a'}`,
                    borderRadius: '12px', padding: '14px 18px',
                    cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'center'
                  }}>

                  {/* Product thumbnail */}
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#111', flexShrink: 0, overflow: 'hidden' }}>
                    {conv.product?.images?.[0]
                      ? <img src={conv.product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0 }}>
                        {conv.otherUser?.name || 'User'}
                      </p>
                      <span style={{ color: '#444', fontSize: '11px' }}>
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>
                      re: <span style={{ color: '#AFA9EC' }}>{conv.product?.title}</span>
                    </p>
                    <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastMessage?.slice(0, 60)}{conv.lastMessage?.length > 60 ? '...' : ''}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span style={{ background: '#534AB7', color: '#fff', borderRadius: '50%', fontSize: '11px', fontWeight: 700, width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Open chat ── */}
        {activeTab === 'chat' && (
          <div>
            <button onClick={() => setActiveTab('messages')}
              style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#888', padding: '6px 14px', cursor: 'pointer', margin: '12px 0 12px 0', fontSize: '13px' }}>
              ← Back to Messages
            </button>
            <Chat
              product={selectedProduct}
              productId={selectedProduct?._id}
              otherUserId={selectedChatUser}
              initialMessage={pendingMessage}
            />
          </div>
        )}

        {/* ── Saved Filters ── */}
        {activeTab === 'filters' && (
          <SavedFilters
            user={user}
            onApplyFilter={handleApplyFilter}
          />
        )}

        {/* ── Wishlist ── */}
        {activeTab === 'wishlist' && (
          <Wishlist onChat={startChat} />
        )}

        {/* ── Transactions ── */}
        {activeTab === 'transactions' && (
          <TransactionList user={user} />
        )}
      </div>
    </div>
  );
};

export default Marketplace;
