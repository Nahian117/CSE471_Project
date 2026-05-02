import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductList.css'; // Reuse product list styles

const Wishlist = ({ onChat }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/products/user/wishlist', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(res.data.filter(p => typeof p === 'object'));
      } catch (err) {
        console.error('Failed to load wishlist', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/products/${productId}/wishlist`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(products.filter(p => p._id !== productId));
    } catch (err) {
      alert('Failed to remove from wishlist');
    }
  };

  const handleBuyNow = (product) => {
    onChat?.(
      product,
      `Hi, I saw this on my wishlist. Is your ${product.title} still available for ৳${product.price}?`
    );
  };

  if (loading) return <div className="product-list-loading">Loading wishlist...</div>;
  if (products.length === 0) return <div className="product-list-empty">Your wishlist is empty. ❤️ some items to save them!</div>;

  return (
    <div className="product-list">
      <div className="products-grid">
        {products.map(product => (
          <div key={product._id} className="product-card">
            <img src={product.images[0]} alt={product.title} />
            <h3>{product.title}</h3>
            <div className="product-meta">
              <span className="price-tag">৳{product.price}</span>
              <span className="condition-tag">{product.condition}</span>
            </div>
            <p className="product-uni">🎓 {product.university}</p>
            {product.location && <p style={{ color: '#aaa', fontSize: '12px', margin: '4px 0 0' }}>📍 {product.location}</p>}
            <p className="product-seller" style={{ marginTop: '4px' }}>🛒 {product.seller?.name}</p>

            <div className="product-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => handleRemove(product._id)} className="delete-btn" style={{ flex: 1 }}>
                💔 Remove
              </button>
              <button onClick={() => handleBuyNow(product)} className="buy-now-btn" style={{ flex: 1 }}>
                💬 Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
