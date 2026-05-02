import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { UNIVERSITIES } from '../constants/universities';
import ProductForm from './ProductForm';
import PickupMap from './PickupMap';
import './ProductList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * ProductList
 *
 * Props:
 *   initialFilters  – filter overrides to pre-apply
 *   onChat          – callback(product, message?) when buyer clicks "Buy Now"
 *   sellerOnly      – if true, fetches only the current user's listings
 */
const ProductList = ({ initialFilters = {}, onChat, sellerOnly = false }) => {
  // Track the serialised form of initialFilters so the effect below
  // only runs when the actual values change, not on every parent render.
  const prevInitialFiltersRef = useRef('');
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    university: '',
    search: '',
    ...initialFilters
  });
  // `loading` is true only on the very first fetch (no products yet).
  // Subsequent re-fetches use `refreshing` so the grid stays visible.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // product being edited
  const [deletingId, setDeletingId] = useState(null);         // id being deleted (for loading state)
  const [reportingProduct, setReportingProduct] = useState(null); // product being reported
  const [reportReason, setReportReason] = useState('');
  const [wishlistIds, setWishlistIds] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  const fetchProducts = useCallback(async (isFirstLoad = false) => {
    if (isFirstLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const params = { ...filters };
      if (sellerOnly && currentUser?.id) {
        params.seller = currentUser.id;
      }
      const response = await axios.get(`${API_URL}/api/products`, { params });
      let data = response.data.products || [];
      if (sellerOnly && currentUser?.id) {
        data = data.filter(p => {
          const sid = p.seller?._id || p.seller;
          return sid === currentUser.id || sid?.toString() === currentUser.id?.toString();
        });
      }
      setProducts(data);
      
      // Fetch wishlist if logged in
      if (currentUser?.id) {
        const wlRes = await axios.get(`${API_URL}/api/products/user/wishlist`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWishlistIds(wlRes.data.map(p => typeof p === 'string' ? p : p._id));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, sellerOnly, currentUser?.id]);

  // Sync initialFilters → local filter state only when values actually change.
  // We serialise to a string so the dep array is stable and the effect
  // only runs when the filter criteria genuinely change.
  const serialisedInitialFilters = JSON.stringify(initialFilters);
  useEffect(() => {
    if (serialisedInitialFilters !== prevInitialFiltersRef.current) {
      prevInitialFiltersRef.current = serialisedInitialFilters;
      setFilters(prev => ({ ...prev, ...initialFilters }));
    }
  }, [serialisedInitialFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track whether this is the very first fetch.
  const hasFetchedOnce = useRef(false);
  useEffect(() => {
    const isFirst = !hasFetchedOnce.current;
    hasFetchedOnce.current = true;
    fetchProducts(isFirst);
  }, [fetchProducts]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleBuyNow = async (product) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to make a purchase.');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/transactions/buy-now`, { productId: product._id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.gatewayUrl) {
        window.location.href = res.data.gatewayUrl;
      } else {
        alert('Could not get payment URL. Please try again.');
      }
    } catch (err) {
      console.error('Buy Now Error:', err.response?.data || err.message);
      alert(err.response?.data?.message || err.message || 'Failed to initiate payment');
    }
  };

  /* ── Delete handler ── */
  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to remove "${product.title}" from listings?`)) return;
    setDeletingId(product._id);
    try {
      await axios.delete(`${API_URL}/api/products/${product._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove from local state
      setProducts(prev => prev.filter(p => p._id !== product._id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Failed to delete product');
    }
    setDeletingId(null);
  };

  /* ── Report handler ── */
  const handleReport = async () => {
    if (!reportReason.trim()) return alert('Please enter a reason');
    try {
      await axios.post(`${API_URL}/api/reports`, {
        itemType: 'Product',
        itemId: reportingProduct._id,
        reason: reportReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Report submitted successfully. Thank you.');
      setReportingProduct(null);
      setReportReason('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report');
    }
  };

  const handleToggleWishlist = async (product) => {
    try {
      const res = await axios.post(`${API_URL}/api/products/${product._id}/wishlist`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlistIds(res.data.wishlist);
    } catch (err) {
      alert('Failed to update wishlist');
    }
  };

  /* ── After edit saved ── */
  const handleEditSuccess = () => {
    setEditingProduct(null);
    fetchProducts();
  };

  return (
    <div className="product-list">

      {/* Edit modal overlay */}
      {editingProduct && (
        <div className="edit-modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <h3 className="edit-modal-title">✏️ Edit Listing</h3>
            <ProductForm
              product={editingProduct}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingProduct(null)}
            />
          </div>
        </div>
      )}

      {/* Filters — hidden in sellerOnly mode to keep it clean */}
      {!sellerOnly && (
        <div className="filters">
          <input
            type="text"
            name="search"
            placeholder="Search products..."
            value={filters.search}
            onChange={handleFilterChange}
          />
          <select name="category" value={filters.category} onChange={handleFilterChange}>
            <option value="">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="books">Books</option>
            <option value="clothing">Clothing</option>
            <option value="furniture">Furniture</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>
          <select name="condition" value={filters.condition} onChange={handleFilterChange}>
            <option value="">All Conditions</option>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="good">Good</option>
          </select>
          <input
            type="number"
            name="minPrice"
            placeholder="Min Price"
            value={filters.minPrice}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="Max Price"
            value={filters.maxPrice}
            onChange={handleFilterChange}
          />
          <select
            name="university"
            value={filters.university}
            onChange={handleFilterChange}
          >
            <option value="">All Universities</option>
            {UNIVERSITIES.map(u => (
              <option key={u.domain} value={u.label}>{u.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Subtle spinner shown only on first load (no products yet) */}
      {loading && (
        <div className="product-list-loading">
          <span className="product-list-spinner" />
          Loading products…
        </div>
      )}

      {/* Refreshing indicator — sits above the grid without collapsing it */}
      {refreshing && !loading && (
        <div className="product-list-refreshing">
          <span className="product-list-spinner" />
        </div>
      )}

      {!loading && products.length === 0 ? (
        <div className="product-list-empty">
          {sellerOnly ? 'You have no active listings.' : 'No products found.'}
        </div>
      ) : !loading ? (
        <div className="products-grid">
          {products.map(product => {
            const sellerName = product.seller?.name || 'Seller';
            const sellerId   = product.seller?._id || product.seller;
            const isOwn      = currentUser?.id && (
              sellerId === currentUser.id ||
              sellerId?.toString() === currentUser.id?.toString()
            );

            return (
              <div key={product._id} className="product-card">
                <img src={product.images[0]} alt={product.title} />

                {/* Own-listing badge */}
                {isOwn && (
                  <span className="own-listing-badge">Your Listing</span>
                )}

                <h3>{product.title}</h3>
                <p className="product-desc">{product.description}</p>
                <div className="product-meta">
                  <span className="price-tag">৳{product.price}</span>
                  <span className="condition-tag">{product.condition}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p className="product-uni">🎓 {product.university}</p>
                    {product.location && <p style={{ color: '#aaa', fontSize: '12px', margin: '4px 0 0' }}>📍 {product.location}</p>}
                    {!isOwn && <p className="product-seller" style={{ marginTop: '4px' }}>🛒 {sellerName}</p>}

                    {/* Pickup Location Map */}
                    {product.pickupLocation?.lat && (
                      <div style={{ marginTop: '10px' }}>
                        <PickupMap pickupLocation={product.pickupLocation} compact={true} />
                      </div>
                    )}
                  </div>
                  {!isOwn && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleToggleWishlist(product)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }} title="Toggle Wishlist">
                        {wishlistIds.includes(product._id) ? '❤️' : '🤍'}
                      </button>
                      <button onClick={() => setReportingProduct(product)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Report this listing">
                        🚩
                      </button>
                    </div>
                  )}
                </div>

                <div className="product-actions">
                  {isOwn ? (
                    <>
                      <button
                        className="edit-btn"
                        onClick={() => setEditingProduct(product)}
                        title="Edit this listing"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product._id}
                        title="Remove this listing"
                      >
                        {deletingId === product._id ? '⏳' : '🗑️ Delete'}
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleBuyNow(product)} className="buy-now-btn">
                        🛒 Buy Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Report Modal overlay */}
      {reportingProduct && (
        <div className="edit-modal-overlay" onClick={() => setReportingProduct(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()} style={{ background: '#1a1a2a', border: '1px solid #2a2a2a', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>🚩 Report Listing</h3>
            <p style={{ color: '#888', fontSize: '13px' }}>Reporting: {reportingProduct.title}</p>
            <textarea
              placeholder="Why are you reporting this listing? (e.g., Fake item, misleading, inappropriate)"
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '10px', marginTop: '10px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setReportingProduct(null)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReport} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;