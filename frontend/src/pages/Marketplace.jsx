import React, { useState, useEffect } from 'react';
import API from '../api';
import ProductList from '../components/ProductList';
import Chat from '../components/Chat';
import SavedFilters from '../components/SavedFilters';
import Wishlist from '../components/Wishlist';
import './Marketplace.css';

const Marketplace = ({ user, externalFilter }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (externalFilter) {
      setFilters(externalFilter);
    }
  }, [externalFilter]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const query = new URLSearchParams(filters).toString();
        const res = await API.get(`/api/products?${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(res.data);
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'marketplace') {
      fetchProducts();
    }
  }, [filters, activeTab]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await API.get('/api/messages/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(res.data);
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    };

    if (activeTab === 'messages') {
      fetchConversations();
    }
  }, [activeTab]);

  const handleChat = (product, initialMessage) => {
    setSelectedProduct(product);
    setChatOpen(true);
    // Optionally send initial message
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setSelectedProduct(null);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'marketplace':
        return (
          <ProductList
            products={products}
            loading={loading}
            onChat={handleChat}
            onFilterChange={handleFilterChange}
            user={user}
          />
        );
      case 'wishlist':
        return <Wishlist onChat={handleChat} />;
      case 'saved-filters':
        return <SavedFilters onFilterApply={handleFilterChange} />;
      case 'messages':
        return (
          <div className="conversations-list">
            {conversations.map(conv => (
              <div key={conv._id} className="conversation-item" onClick={() => handleChat(conv.product, '')}>
                <img src={conv.product?.images?.[0]} alt={conv.product?.title} />
                <div>
                  <h4>{conv.product?.title}</h4>
                  <p>{conv.lastMessage?.content}</p>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="marketplace">
      <header className="marketplace-header">
        <h1>Campus Marketplace</h1>
        <nav className="marketplace-nav">
          <button
            className={activeTab === 'marketplace' ? 'active' : ''}
            onClick={() => setActiveTab('marketplace')}
          >
            🛒 Marketplace
          </button>
          <button
            className={activeTab === 'wishlist' ? 'active' : ''}
            onClick={() => setActiveTab('wishlist')}
          >
            ❤️ Wishlist
          </button>
          <button
            className={activeTab === 'saved-filters' ? 'active' : ''}
            onClick={() => setActiveTab('saved-filters')}
          >
            🔍 Saved Filters
          </button>
          <button
            className={activeTab === 'messages' ? 'active' : ''}
            onClick={() => setActiveTab('messages')}
          >
            💬 Messages
          </button>
        </nav>
      </header>

      <main className="marketplace-content">
        {renderContent()}
      </main>

      {chatOpen && selectedProduct && (
        <Chat
          product={selectedProduct}
          onClose={handleCloseChat}
          user={user}
        />
      )}
    </div>
  );
};

export default Marketplace;