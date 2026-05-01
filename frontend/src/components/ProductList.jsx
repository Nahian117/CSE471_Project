import React, { useState } from 'react';
import API from '../api';
import './ProductList.css';

const ProductList = ({ products, loading, onChat, onFilterChange, user }) => {
  const [filters, setFilters] = useState({
    search: '',
    university: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    condition: '',
  });

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleWishlist = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      await API.post(`/api/products/${productId}/wishlist`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Added to wishlist!');
    } catch (err) {
      alert('Failed to add to wishlist');
    }
  };

  const handleReport = async (productId) => {
    const reason = prompt('Reason for reporting:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      await API.post('/api/reports', {
        productId,
        reason,
        type: 'product'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Product reported successfully');
    } catch (err) {
      alert('Failed to report product');
    }
  };

  const handleBuyNow = (product) => {
    onChat(product, `Hi, I'm interested in your ${product.title} for ৳${product.price}. Is it still available?`);
  };

  if (loading) return <div className="product-list-loading">Loading products...</div>;
  if (products.length === 0) return <div className="product-list-empty">No products found. Try adjusting your filters!</div>;

  return (
    <div className="product-list">
      <form onSubmit={handleFilterSubmit} className="filters-form">
        <input
          type="text"
          placeholder="Search products..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.university}
          onChange={(e) => setFilters({ ...filters, university: e.target.value })}
        >
          <option value="">All Universities</option>
          <option value="BUET">BUET</option>
          <option value="DU">DU</option>
          <option value="CUET">CUET</option>
          <option value="RUET">RUET</option>
          <option value="KUET">KUET</option>
          <option value="CU">CU</option>
          <option value="JU">JU</option>
          <option value="BRAC">BRAC</option>
          <option value="NSU">NSU</option>
          <option value="IUB">IUB</option>
          <option value="AIUB">AIUB</option>
          <option value="EWU">EWU</option>
          <option value="UIU">UIU</option>
          <option value="ULAB">ULAB</option>
          <option value="UAP">UAP</option>
          <option value="DIU">DIU</option>
          <option value="AUST">AUST</option>
          <option value="BUP">BUP</option>
          <option value="MBSTU">MBSTU</option>
          <option value="HSTU">HSTU</option>
          <option value="JUST">JUST</option>
          <option value="PUST">PUST</option>
          <option value="RMSTU">RMSTU</option>
          <option value="BSMRSTU">BSMRSTU</option>
          <option value="PSTU">PSTU</option>
          <option value="CVASU">CVASU</option>
          <option value="BAU">BAU</option>
          <option value="SAU">SAU</option>
          <option value="SUST">SUST</option>
          <option value="BUTEX">BUTEX</option>
          <option value="KU">KU</option>
          <option value="RU">RU</option>
          <option value="JKKNIU">JKKNIU</option>
          <option value="BSMMU">BSMMU</option>
          <option value="SSMC">SSMC</option>
          <option value="AFMC">AFMC</option>
          <option value="CMC">CMC</option>
          <option value="Other">Other</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="Books">Books</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Furniture">Furniture</option>
          <option value="Sports">Sports</option>
          <option value="Other">Other</option>
        </select>
        <input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
        <select
          value={filters.condition}
          onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
        >
          <option value="">Any Condition</option>
          <option value="New">New</option>
          <option value="Like New">Like New</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Poor">Poor</option>
        </select>
        <button type="submit">Apply Filters</button>
      </form>

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

            <div className="product-actions">
              <button onClick={() => handleBuyNow(product)} className="buy-now-btn">
                💬 Message
              </button>
              <button onClick={() => handleWishlist(product._id)} className="wishlist-btn">
                ❤️ Wishlist
              </button>
              {user?.role === 'admin' && (
                <button onClick={() => handleReport(product._id)} className="report-btn">
                  🚨 Report
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;